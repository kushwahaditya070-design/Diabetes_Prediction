# =====================================================
# GLUCOCHECK - FLASK BACKEND
# Loads the trained model and serves predictions.
# =====================================================

from pathlib import Path

import joblib
import numpy as np
from flask import Flask, jsonify, render_template, request


# -----------------------------------------------------
# APP CONFIGURATION
# -----------------------------------------------------

app = Flask(__name__)

# Project root directory
BASE_DIR = Path(__file__).resolve().parent

# Trained model path
MODEL_PATH = BASE_DIR / "diabetes_model.pkl"


# -----------------------------------------------------
# MODEL FEATURE ORDER
# IMPORTANT: Keep this order consistent with training.
# -----------------------------------------------------

FEATURES = [
    "Pregnancies",
    "Glucose",
    "BloodPressure",
    "SkinThickness",
    "Insulin",
    "BMI",
    "DiabetesPedigreeFunction",
    "Age"
]


# -----------------------------------------------------
# LOAD TRAINED MODEL
# -----------------------------------------------------

try:
    model = joblib.load(MODEL_PATH)
    print("GlucoCheck: Model loaded successfully.")

except Exception as error:
    model = None
    print(f"GlucoCheck: Could not load model: {error}")


# -----------------------------------------------------
# HOME PAGE
# -----------------------------------------------------

@app.route("/", methods=["GET"])
def home():
    return render_template("index.html")


# -----------------------------------------------------
# PREDICTION API
# Endpoint: POST /api/predict
# -----------------------------------------------------

@app.route("/api/predict", methods=["POST"])
def predict():

    # Ensure the model is available.
    if model is None:
        return jsonify({
            "error": (
                "The prediction model could not be loaded. "
                "Check that diabetes_model.pkl exists and is valid."
            )
        }), 500

    # Read JSON submitted by app.js.
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({
            "error": "Invalid request. Please submit valid JSON data."
        }), 400

    # Check that every required feature is present.
    missing_features = [
        feature for feature in FEATURES
        if feature not in data or data[feature] in (None, "")
    ]

    if missing_features:
        return jsonify({
            "error": "Missing required input fields.",
            "missing_features": missing_features
        }), 400

    # Convert inputs to numeric values.
    try:
        values = []

        for feature in FEATURES:
            value = float(data[feature])

            if not np.isfinite(value):
                return jsonify({
                    "error": f"{feature} must be a finite number."
                }), 400

            values.append(value)

    except (TypeError, ValueError):
        return jsonify({
            "error": "All input fields must contain valid numbers."
        }), 400

    # Use a 2D array in the exact order used during training.
    input_data = np.array(values, dtype=float).reshape(1, -1)

    # -------------------------------------------------
    # MODEL INFERENCE
    # -------------------------------------------------

    try:
        # Predicted class, typically 0 or 1.
        prediction = int(model.predict(input_data)[0])

        # Get the estimated probability for class 1.
        if hasattr(model, "predict_proba"):
            probabilities = model.predict_proba(input_data)[0]
            classes = list(model.classes_)

            if 1 not in classes:
                return jsonify({
                    "error": (
                        "The trained model does not contain "
                        "the expected positive class (1)."
                    )
                }), 500

            positive_index = classes.index(1)
            probability = float(probabilities[positive_index]) * 100

        else:
            # Do not invent a probability for models that
            # do not support predict_proba().
            return jsonify({
                "error": (
                    "This model does not support probability "
                    "estimation. Use a compatible trained model."
                )
            }), 500

        # Prepare user-facing result text.
        if prediction == 1:
            label = "Elevated model-estimated risk"
            message = (
                "The model predicts the positive class. "
                "This result is not a diagnosis; consult a "
                "qualified healthcare professional for evaluation."
            )
        else:
            label = "Lower model-estimated risk"
            message = (
                "The model predicts the negative class. "
                "This result does not rule out diabetes. "
                "Consult a healthcare professional if you have concerns."
            )

        # Return the keys expected by app.js.
        return jsonify({
            "prediction": prediction,
            "probability": round(probability, 2),
            "label": label,
            "message": message
        }), 200

    except Exception as error:
        app.logger.exception("Prediction failed: %s", error)

        return jsonify({
            "error": (
                "Prediction failed. Verify that the model "
                "matches the input features and their order."
            )
        }), 500


# -----------------------------------------------------
# RUN DEVELOPMENT SERVER
# -----------------------------------------------------

if __name__ == "__main__":
    app.run(
        host="127.0.0.1",
        port=5000,
        debug=False
    )
