# GlucoCheck — Diabetes Risk Estimator

A responsive frontend built with HTML, CSS and vanilla JavaScript, with a Flask JSON API that loads the supplied `diabetes_model.pkl`.

## Run locally

1. Install Python 3.10 or newer.
2. Open a terminal in this folder.
3. (Recommended) Create and activate a virtual environment.
4. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

5. Start the app:

   ```bash
   python app.py
   ```

6. Open http://127.0.0.1:5000 in your browser.

## API

- `GET /api/health` — reports whether the model loaded.
- `POST /api/predict` — JSON body with the eight model inputs:
  `Pregnancies`, `Glucose`, `BloodPressure`, `SkinThickness`, `Insulin`, `BMI`,
  `DiabetesPedigreeFunction`, `Age`.

The app preserves the uploaded model and sends inputs in the feature order above. It does not train or recalibrate the model.

## Important health notice

This is an educational software prototype, not a medical device. The model output is not a diagnosis or a clinically validated personal risk score. Do not use it to make treatment decisions; consult a qualified healthcare professional for medical interpretation.

## Notes

- The included Excel file is the supplied dataset for reference and is not required at runtime.
- The uploaded model was serialized with scikit-learn 1.6.1. If you encounter a pickle compatibility warning, use a compatible scikit-learn version in your environment where possible. Only load pickle files you trust.
