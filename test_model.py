"""
ml-service/tests/test_model.py
Unit tests for model building + data preparation.
No network calls — fully offline.
"""
import numpy as np
import pytest
import tensorflow as tf

# Add src to path
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from src.model import build_model, PositionalEncoding, TransformerBlock


class TestModelBuild:
    """Test model construction with various parameter combinations."""

    def test_basic_build(self):
        model = build_model(timesteps=30, n_features=10, horizon=1)
        assert model is not None
        assert model.name == "LSTM_Transformer_Hybrid"

    def test_output_shape_horizon_1(self):
        model = build_model(timesteps=30, n_features=10, horizon=1)
        x = np.random.randn(4, 30, 10).astype(np.float32)
        out = model(x, training=False)
        assert out.shape == (4, 1)

    def test_output_shape_horizon_7(self):
        model = build_model(timesteps=60, n_features=25, horizon=7)
        x = np.random.randn(2, 60, 25).astype(np.float32)
        out = model(x, training=False)
        assert out.shape == (2, 7)

    def test_output_shape_horizon_30(self):
        model = build_model(timesteps=60, n_features=25, horizon=30)
        x = np.random.randn(1, 60, 25).astype(np.float32)
        out = model(x, training=False)
        assert out.shape == (1, 30)

    def test_multiple_transformer_blocks(self):
        model = build_model(
            timesteps=30, n_features=8, horizon=3,
            num_transformer_blocks=4, embed_dim=32, num_heads=4,
        )
        x = np.random.randn(2, 30, 8).astype(np.float32)
        out = model(x, training=False)
        assert out.shape == (2, 3)

    def test_embed_dim_must_be_divisible_by_num_heads(self):
        with pytest.raises(AssertionError):
            build_model(timesteps=30, n_features=8, embed_dim=64, num_heads=3)

    def test_model_has_expected_layers(self):
        model = build_model(timesteps=30, n_features=10, horizon=1, lstm_layers=2)
        layer_names = [l.name for l in model.layers]
        assert "lstm_1" in layer_names
        assert "lstm_2" in layer_names
        assert "pos_enc" in layer_names
        assert "global_pool" in layer_names
        assert "output" in layer_names

    def test_model_is_serialisable(self, tmp_path):
        """Verify model can be saved and reloaded."""
        from src.model import PositionalEncoding, TransformerBlock
        model = build_model(timesteps=20, n_features=5, horizon=2)
        path = str(tmp_path / "test_model.keras")
        model.save(path)
        loaded = tf.keras.models.load_model(
            path,
            custom_objects={
                "PositionalEncoding": PositionalEncoding,
                "TransformerBlock": TransformerBlock,
            }
        )
        x = np.random.randn(1, 20, 5).astype(np.float32)
        np.testing.assert_allclose(
            model(x, training=False).numpy(),
            loaded(x, training=False).numpy(),
            rtol=1e-5,
        )


class TestPositionalEncoding:
    def test_output_shape(self):
        pe = PositionalEncoding(embed_dim=64, max_len=100)
        x = tf.random.normal((2, 50, 64))
        out = pe(x)
        assert out.shape == (2, 50, 64)

    def test_adds_position_info(self):
        pe = PositionalEncoding(embed_dim=16, max_len=50)
        x = tf.zeros((1, 10, 16))
        out = pe(x)
        # Output should not be all zeros — PE was added
        assert not np.allclose(out.numpy(), 0)


class TestTrainServiceHelpers:
    def test_make_sequences_shape(self):
        from src.services.train_service import TrainService
        data = np.random.randn(200, 10).astype(np.float32)
        X, y = TrainService._make_sequences(data, seq_len=60, horizon=7)
        assert X.shape[1] == 60
        assert X.shape[2] == 10
        assert y.shape[1] == 7
        # Number of sequences = 200 - 60 - 7 + 1
        assert X.shape[0] == 200 - 60 - 7 + 1

    def test_make_sequences_no_overlap_between_X_and_y(self):
        """Ensures there is no future leakage in sequence construction."""
        from src.services.train_service import TrainService
        data = np.arange(100).reshape(100, 1).astype(np.float32)
        seq_len, horizon = 10, 5
        X, y = TrainService._make_sequences(data, seq_len, horizon)

        # For the first sequence: X[0] == data[0:10], y[0] == data[10:15, 0]
        np.testing.assert_array_equal(X[0, :, 0], data[0:10, 0])
        np.testing.assert_array_equal(y[0], data[10:15, 0])
