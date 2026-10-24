"use strict";

// =====================================================
// GLUCOCHECK - FRONTEND LOGIC
// API endpoint and existing HTML IDs are preserved.
// =====================================================

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("prediction-form");
    const submitBtn = document.getElementById("submit-btn");
    const resetBtn = document.getElementById("reset-btn");
    const formError = document.getElementById("form-error");

    const resultCard = document.getElementById("result-card");
    const resultStatus = document.getElementById("result-status");
    const emptyResult = document.getElementById("empty-result");
    const filledResult = document.getElementById("filled-result");

    const probabilityElement = document.getElementById("probability");
    const progressFill = document.getElementById("progress-fill");
    const resultVerdict = document.getElementById("result-verdict");
    const resultMessage = document.getElementById("result-message");

    if (!form) {
        console.error("GlucoCheck: prediction form was not found.");
        return;
    }

    // Keep the original Flask feature names and model order.
    const featureNames = [
        "Pregnancies",
        "Glucose",
        "BloodPressure",
        "SkinThickness",
        "Insulin",
        "BMI",
        "DiabetesPedigreeFunction",
        "Age"
    ];

    // Show a message inside the existing error element.
    function showError(message) {
        formError.textContent = message;
        formError.hidden = false;
    }

    // Clear previous errors.
    function clearError() {
        formError.textContent = "";
        formError.hidden = true;
    }

    // Restore the initial result panel.
    function resetResult() {
        emptyResult.classList.remove("hidden");
        filledResult.classList.add("hidden");

        resultStatus.textContent = "Awaiting input";
        probabilityElement.textContent = "0";
        progressFill.style.width = "0%";
        resultVerdict.textContent = "Prediction result";
        resultMessage.textContent = "";

        resultCard.classList.remove("has-result", "high-risk", "low-risk");
    }

    // Read all fields and construct the payload expected by Flask.
    function collectFormData() {
        const payload = {};

        for (const feature of featureNames) {
            const input = form.elements.namedItem(feature);

            if (!input || input.value.trim() === "") {
                throw new Error(`Please enter a value for ${feature}.`);
            }

            const value = Number(input.value);

            if (!Number.isFinite(value)) {
                throw new Error(`Please enter a valid number for ${feature}.`);
            }

            payload[feature] = value;
        }

        return payload;
    }

    // Basic browser-side validation.
    function validatePayload(payload) {
        for (const feature of featureNames) {
            const input = form.elements.namedItem(feature);

            if (input && !input.checkValidity()) {
                input.reportValidity();
                return false;
            }

            if (!Number.isFinite(payload[feature])) {
                showError(`Invalid value for ${feature}.`);
                return false;
            }
        }

        return true;
    }

    // Display the prediction returned by the Flask backend.
    function displayResult(data) {
        const probability = Number(data.probability);
        const prediction = Number(data.prediction);

        if (
            !Number.isFinite(probability) ||
            probability < 0 ||
            probability > 100 ||
            !Number.isFinite(prediction)
        ) {
            throw new Error("The server returned an invalid prediction result.");
        }

        const boundedProbability = Math.min(100, Math.max(0, probability));
        const isPositive = prediction === 1;

        emptyResult.classList.add("hidden");
        filledResult.classList.remove("hidden");

        resultCard.classList.add("has-result");
        resultCard.classList.toggle("high-risk", isPositive);
        resultCard.classList.toggle("low-risk", !isPositive);

        resultStatus.textContent = data.label ||
            (isPositive ? "Elevated model-estimated risk" : "Lower model-estimated risk");

        probabilityElement.textContent = boundedProbability.toFixed(1);
        progressFill.style.width = `${boundedProbability}%`;

        resultVerdict.textContent = isPositive
            ? "Positive model prediction"
            : "Negative model prediction";

        resultMessage.textContent = data.message ||
            "This is a machine-learning estimate, not a clinical diagnosis.";

        // Move the user's focus to the updated result panel.
        resultCard.setAttribute("tabindex", "-1");
        resultCard.focus({ preventScroll: true });
    }

    // Submit the form to the existing Flask endpoint.
    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        clearError();

        let payload;

        try {
            payload = collectFormData();
        } catch (error) {
            showError(error.message);
            return;
        }

        if (!validatePayload(payload)) {
            return;
        }

        const originalButtonContent = submitBtn.innerHTML;

        submitBtn.disabled = true;
        submitBtn.innerHTML = "<span>Analyzing signals...</span><span>◌</span>";
        form.setAttribute("aria-busy", "true");

        try {
            const response = await fetch("/api/predict", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify(payload)
            });

            let data;

            try {
                data = await response.json();
            } catch {
                throw new Error("The server returned an unreadable response.");
            }

            if (!response.ok) {
                throw new Error(
                    data.error ||
                    data.message ||
                    `Prediction request failed (HTTP ${response.status}).`
                );
            }

            displayResult(data);
        } catch (error) {
            console.error("GlucoCheck prediction error:", error);
            showError(
                error.message ||
                "Unable to connect to the prediction service. Please try again."
            );
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalButtonContent;
            form.removeAttribute("aria-busy");
        }
    });

    // Reset fields and restore the initial result state.
    form.addEventListener("reset", () => {
        window.setTimeout(() => {
            clearError();
            resetResult();
        }, 0);
    });

    if (resetBtn) {
        resetBtn.addEventListener("click", clearError);
    }

    // Clear error messages as the user edits the form.
    form.addEventListener("input", () => {
        if (!formError.hidden) {
            clearError();
        }
    });

    // Initial state.
    resetResult();
});
