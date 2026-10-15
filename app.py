from flask import Flask, render_template, request, jsonify
import numpy as np
import pickle
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "diabetes_model.pkl"

app = Flask(__name__)

FEATURES = [
    "Pregnancies", "Glucose", "BloodPressure", "SkinThickness",
    "Insulin", "BMI", "DiabetesPedigreeFunction", "Age"
]

# This project uses the uploaded LogisticRegression model as provided.
# The model expects these eight features in exactly this order.
with MODEL_PATH.open("rb") as model_file:
    model = pickle.load(model_file)


def validate_payload(payload):
    values = []
    errors = {}
    limits = {
        "Pregnancies": (0, 20),
        "Glucose": (0, 400),
        "BloodPressure": (0, 250),
        "SkinThickness": (0, 150),
        "Insulin": (0, 1000),
        "BMI": (0, 100),
        "DiabetesPedigreeFunction": (0, 5),
        "Age": (1, 120),
    }
    for feature in FEATURES:
        raw = payload.get(feature)
        try:
            value = float(raw)
            if not np.isfinite(value):
                raise ValueError
            low, high = limits[feature]
            if value < low or value > high:
                errors[feature] = f"Enter a value between {low} and {high}."
            else:
                values.append(value)
        except (TypeError, ValueError):
            errors[feature] = "Enter a valid number."
    return values, errors


@app.get("/")
def home():
    return render_template("index.html")


@app.get("/api/health")
def health():
    return jsonify({"status": "ok", "model_loaded": model is not None})


@app.post("/api/predict")
def predict():
    payload = request.get_json(silent=True) or request.form.to_dict()
    values, errors = validate_payload(payload)
    if errors:
        return jsonify({"success": False, "errors": errors}), 400

    features = np.asarray(values, dtype=float).reshape(1, -1)
    prediction = int(model.predict(features)[0])
    probability = float(model.predict_proba(features)[0][1]) if hasattr(model, "predict_proba") else None
    probability_percent = round(probability * 100, 1) if probability is not None else None

    return jsonify({
        "success": True,
        "prediction": prediction,
        "label": "Higher model-estimated likelihood" if prediction == 1 else "Lower model-estimated likelihood",
        "probability": probability_percent,
        "message": (
            "The model flagged this input for follow-up. This is not a diagnosis."
            if prediction == 1 else
            "The model did not flag this input. This does not rule out diabetes."
        )
    })


if __name__ == "__main__":
    app.run(debug=True, host="127.0.0.1", port=5000)
