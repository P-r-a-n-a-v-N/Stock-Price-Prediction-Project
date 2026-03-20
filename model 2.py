"""
ml-service/src/model.py
LSTM + Transformer hybrid model.
Fully serialisable (.keras format). No race conditions — stateless build fn.
"""
from __future__ import annotations

import numpy as np
import tensorflow as tf
from tensorflow.keras import layers, Model
from tensorflow.keras.layers import (
    Input, LSTM, Dense, Dropout, LayerNormalization,
    MultiHeadAttention, GlobalAveragePooling1D, BatchNormalization,
    Add, Activation,
)


# ── Positional Encoding ────────────────────────────────────────────────────────

class PositionalEncoding(layers.Layer):
    """Sinusoidal positional encoding. Pre-computed, no trainable weights."""

    def __init__(self, embed_dim: int, max_len: int = 512, **kwargs: object) -> None:
        super().__init__(**kwargs)
        self.embed_dim = embed_dim
        self.max_len = max_len

        position = np.arange(max_len)[:, np.newaxis]
        div_term = np.exp(
            np.arange(0, embed_dim, 2) * -(np.log(10000.0) / embed_dim)
        )
        pe = np.zeros((max_len, embed_dim), dtype=np.float32)
        pe[:, 0::2] = np.sin(position * div_term)
        pe[:, 1::2] = np.cos(position * div_term)
        # shape: (1, max_len, embed_dim) — not a trainable weight
        self._pe = tf.constant(pe[np.newaxis, ...], dtype=tf.float32)

    def call(self, x: tf.Tensor) -> tf.Tensor:
        seq_len = tf.shape(x)[1]
        return x + self._pe[:, :seq_len, :]

    def get_config(self) -> dict:
        cfg = super().get_config()
        cfg.update({"embed_dim": self.embed_dim, "max_len": self.max_len})
        return cfg


# ── Transformer Block ──────────────────────────────────────────────────────────

class TransformerBlock(layers.Layer):
    """
    Single Transformer encoder block.
    Pre-LayerNorm variant (more stable training than post-LN).
    """

    def __init__(
        self,
        embed_dim: int,
        num_heads: int,
        ff_dim: int,
        dropout_rate: float = 0.1,
        **kwargs: object,
    ) -> None:
        super().__init__(**kwargs)
        self.embed_dim = embed_dim
        self.num_heads = num_heads
        self.ff_dim = ff_dim
        self.dropout_rate = dropout_rate

        self.norm1 = LayerNormalization(epsilon=1e-6)
        self.norm2 = LayerNormalization(epsilon=1e-6)
        self.att = MultiHeadAttention(
            num_heads=num_heads,
            key_dim=embed_dim // num_heads,
            dropout=dropout_rate,
        )
        self.ffn = tf.keras.Sequential([
            Dense(ff_dim, activation="gelu"),
            Dropout(dropout_rate),
            Dense(embed_dim),
        ])
        self.drop1 = Dropout(dropout_rate)
        self.drop2 = Dropout(dropout_rate)

    def call(self, x: tf.Tensor, training: bool = False) -> tf.Tensor:
        # Pre-norm attention
        normed = self.norm1(x)
        attn = self.att(normed, normed, training=training)
        x = x + self.drop1(attn, training=training)

        # Pre-norm FFN
        normed = self.norm2(x)
        ffn_out = self.ffn(normed, training=training)
        return x + self.drop2(ffn_out, training=training)

    def get_config(self) -> dict:
        cfg = super().get_config()
        cfg.update({
            "embed_dim": self.embed_dim,
            "num_heads": self.num_heads,
            "ff_dim": self.ff_dim,
            "dropout_rate": self.dropout_rate,
        })
        return cfg


# ── Model Builder ──────────────────────────────────────────────────────────────

def build_model(
    timesteps: int,
    n_features: int,
    horizon: int = 1,
    lstm_units: int = 128,
    lstm_layers: int = 2,
    num_transformer_blocks: int = 2,
    embed_dim: int = 64,
    num_heads: int = 4,
    ff_dim: int = 128,
    dropout_rate: float = 0.15,
) -> Model:
    """
    Builds the LSTM → Transformer hybrid model.

    Args:
        timesteps:              Input window length (e.g., 60 days).
        n_features:             Number of input features.
        horizon:                Number of future days to predict.
        lstm_units:             Hidden units in each LSTM layer.
        lstm_layers:            Number of stacked LSTM layers.
        num_transformer_blocks: Number of Transformer encoder blocks.
        embed_dim:              Dimension projected to before Transformer.
        num_heads:              Multi-head attention heads.
        ff_dim:                 Feed-forward inner dimension.
        dropout_rate:           Dropout probability throughout model.

    Returns:
        Compiled Keras Model.
    """
    assert embed_dim % num_heads == 0, "embed_dim must be divisible by num_heads"

    inputs = Input(shape=(timesteps, n_features), name="input_seq")
    x = inputs

    # ── LSTM backbone ──────────────────────────────────────────────────────────
    for i in range(lstm_layers):
        return_seq = True  # always return sequences; pool later
        x = LSTM(
            lstm_units if i == 0 else lstm_units // 2,
            return_sequences=return_seq,
            dropout=dropout_rate,
            recurrent_dropout=0.0,  # keep 0 — recurrent dropout kills speed
            name=f"lstm_{i + 1}",
        )(x)
        x = BatchNormalization(name=f"bn_lstm_{i + 1}")(x)

    # ── Project to Transformer embedding dim ──────────────────────────────────
    x = Dense(embed_dim, activation="linear", name="projection")(x)
    x = PositionalEncoding(embed_dim=embed_dim, max_len=timesteps, name="pos_enc")(x)

    # ── Transformer encoder ───────────────────────────────────────────────────
    for i in range(num_transformer_blocks):
        x = TransformerBlock(
            embed_dim=embed_dim,
            num_heads=num_heads,
            ff_dim=ff_dim,
            dropout_rate=dropout_rate,
            name=f"transformer_{i + 1}",
        )(x)

    # ── Output head ───────────────────────────────────────────────────────────
    x = GlobalAveragePooling1D(name="global_pool")(x)
    x = Dropout(dropout_rate, name="head_dropout")(x)
    x = Dense(64, activation="gelu", name="head_dense")(x)
    outputs = Dense(horizon, activation="linear", name="output")(x)

    model = Model(inputs, outputs, name="LSTM_Transformer_Hybrid")

    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=5e-4, clipnorm=1.0),
        loss=tf.keras.losses.Huber(delta=1.0),
        metrics=["mae", tf.keras.metrics.RootMeanSquaredError(name="rmse")],
    )
    return model
