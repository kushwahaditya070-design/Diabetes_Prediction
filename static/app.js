const form = document.querySelector("#prediction-form");
const resetBtn = document.querySelector("#reset-btn");
const submitBtn = document.querySelector("#submit-btn");
const errorBox = document.querySelector("#form-error");
const emptyResult = document.querySelector("#empty-result");
const filledResult = document.querySelector("#filled-result");
const statusPill = document.querySelector("#result-status");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  errorBox.textContent = "";
  if (!form.reportValidity()) return;

  const payload = Object.fromEntries(new FormData(form).entries());
  submitBtn.disabled = true;
  submitBtn.querySelector("span").textContent = "Calculating…";
  statusPill.textContent = "Processing";

  try {
    const response = await fetch("/api/predict", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) {
      const messages = Object.entries(data.errors || {}).map(([field, msg]) => `${field}: ${msg}`);
      throw new Error(messages.join(" "));
    }

    emptyResult.classList.add("hidden");
    filledResult.classList.remove("hidden");
    document.querySelector("#probability").textContent = data.probability ?? "—";
    document.querySelector("#progress-fill").style.width = `${data.probability ?? 0}%`;
    document.querySelector("#result-verdict").textContent = data.label;
    document.querySelector("#result-message").textContent = data.message;
    statusPill.textContent = "Estimate ready";
    statusPill.style.background = data.prediction === 1 ? "#fff0ed" : "#e9f8f0";
    statusPill.style.color = data.prediction === 1 ? "#bf6656" : "#32966b";
    document.querySelector("#result-verdict").style.color = data.prediction === 1 ? "#bd6958" : "#32966b";
  } catch (error) {
    errorBox.textContent = error.message || "Unable to calculate right now. Please try again.";
    statusPill.textContent = "Could not calculate";
  } finally {
    submitBtn.disabled = false;
    submitBtn.querySelector("span").textContent = "Generate estimate";
  }
});

resetBtn.addEventListener("click", () => {
  form.reset();
  errorBox.textContent = "";
  emptyResult.classList.remove("hidden");
  filledResult.classList.add("hidden");
  statusPill.textContent = "Awaiting input";
  statusPill.removeAttribute("style");
  document.querySelector("#progress-fill").style.width = "0%";
});

// Smoothly focus the first field after a reset.
resetBtn.addEventListener("click", () => {
  const first = form.querySelector('input[name="Age"]');
  if (first) first.focus({preventScroll: true});
});
