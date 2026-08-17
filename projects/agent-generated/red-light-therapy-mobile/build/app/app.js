(function setupApp() {
  const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const SAFE_MAX_DAILY_DOSE = 12;

  const calculator = window.RedLightCalculator;
  const form = document.getElementById("planner-form");
  const result = document.getElementById("result");
  const warning = document.getElementById("warning");
  const schedule = document.getElementById("schedule");
  const goalSelect = document.getElementById("goal");

  const GOAL_DOSES = {
    recovery: 6,
    skin: 5,
    maintenance: 4,
  };

  function renderWeeklyPlan(plan) {
    const fragments = plan.map(function mapDay(day) {
      const status = day.scheduled
        ? day.plannedDoseJcm2.toFixed(1) + " J/cm2"
        : "Rest";
      return "<li><strong>" + DAYS[day.dayIndex] + ":</strong> " + status + "</li>";
    });
    schedule.innerHTML = fragments.join("");
  }

  goalSelect.addEventListener("change", function updateDoseFromGoal() {
    const doseInput = document.getElementById("targetDoseJcm2");
    const selectedDose = GOAL_DOSES[goalSelect.value];
    if (selectedDose) {
      doseInput.value = selectedDose;
    }
  });

  form.addEventListener("submit", function handleSubmit(event) {
    event.preventDefault();
    warning.textContent = "";

    const targetDoseJcm2 = Number(document.getElementById("targetDoseJcm2").value);
    const irradianceMwCm2 = Number(document.getElementById("irradianceMwCm2").value);
    const sessionsPerWeek = Number(document.getElementById("sessionsPerWeek").value);
    const startDay = Number(document.getElementById("startDay").value);

    try {
      const minutes = calculator.calculateSessionMinutes({
        targetDoseJcm2,
        irradianceMwCm2,
      });

      const deliveredDose = calculator.calculateDeliveredDose({
        minutes,
        irradianceMwCm2,
      });

      const weeklyPlan = calculator.buildWeeklyPlan({
        daysPerWeek: sessionsPerWeek,
        dosePerSessionJcm2: deliveredDose,
        startDay,
      });

      const weeklyTotal = deliveredDose * sessionsPerWeek;

      result.innerHTML = "<p><strong>Session length:</strong> "
        + minutes.toFixed(1)
        + " minutes</p><p><strong>Dose per session:</strong> "
        + deliveredDose.toFixed(1)
        + " J/cm2</p><p><strong>Weekly total:</strong> "
        + weeklyTotal.toFixed(1)
        + " J/cm2</p>";

      if (deliveredDose > SAFE_MAX_DAILY_DOSE) {
        warning.textContent = "Warning: planned dose exceeds "
          + SAFE_MAX_DAILY_DOSE
          + " J/cm2 in a single day. Re-check your device irradiance and care plan with a clinician.";
      }

      renderWeeklyPlan(weeklyPlan);
    } catch (error) {
      result.innerHTML = "<p class='error'>" + error.message + "</p>";
      schedule.innerHTML = "";
    }
  });
}());
