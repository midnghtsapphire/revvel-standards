/**
 * WR-4600 Photon Bench — dose engine.
 *
 * Deterministic photobiomodulation dose math. No Date/Math.random, so the
 * Bench is reproducible and testable. Works in the browser (window.DoseEngine)
 * and in Node (require) via the same UMD wrapper.
 *
 * Physics floor (WR-4600.1 LUMEN):
 *   Fluence J/cm2 = irradiance mW/cm2 * seconds / 1000.
 *   Irradiance and fluence are INDEPENDENT parameters — equal joules at
 *   unequal power density are not equal treatments (Lopes: 55 vs 155 mW/cm2,
 *   same 0.9 J/cm2, opposite outcomes). Never collapse them into one number.
 *
 * The dose-response curve is the Arndt-Schulz biphasic form. It is SCHEMATIC —
 * pedagogically honest, deliberately not predictive. It exists to kill naive
 * "more light is better" builds, not to forecast an outcome.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.DoseEngine = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // Anchors from the ledger (Shard 01), all tagged in the dashboard:
  //   fluence commonly 1-20 J/cm2; irradiance commonly 5-50 mW/cm2 for
  //   stimulation/healing; 1-5 J/cm2 reported ideal for proliferation;
  //   peak ATP ~3 J/cm2 at 25 mW/cm2 in cortical neurons.
  var FLUENCE_WINDOW = { min: 1, max: 20 };        // J/cm2, therapeutic band
  var IRRADIANCE_WINDOW = { min: 5, max: 50 };     // mW/cm2, stimulation band
  var PROLIFERATION_PEAK = 3;                       // J/cm2, schematic curve peak

  /**
   * Fluence (radiant exposure) in J/cm2.
   * @param {number} irradianceMwCm2  power density at the treatment plane
   * @param {number} exposureSeconds  exposure time
   * @returns {number} J/cm2
   */
  function fluence(irradianceMwCm2, exposureSeconds) {
    if (!isFiniteNumber(irradianceMwCm2) || irradianceMwCm2 < 0) {
      throw new Error("irradiance must be a non-negative number (mW/cm2)");
    }
    if (!isFiniteNumber(exposureSeconds) || exposureSeconds < 0) {
      throw new Error("exposure must be a non-negative number (seconds)");
    }
    return (irradianceMwCm2 * exposureSeconds) / 1000;
  }

  /**
   * Total radiant energy in joules over a spot area.
   * @param {number} fluenceJcm2  J/cm2
   * @param {number} spotAreaCm2  cm2
   */
  function totalJoules(fluenceJcm2, spotAreaCm2) {
    if (!isFiniteNumber(fluenceJcm2) || fluenceJcm2 < 0) {
      throw new Error("fluence must be a non-negative number (J/cm2)");
    }
    if (!isFiniteNumber(spotAreaCm2) || spotAreaCm2 <= 0) {
      throw new Error("spotArea must be a positive number (cm2)");
    }
    return fluenceJcm2 * spotAreaCm2;
  }

  /**
   * Exposure time (seconds) required to reach a target fluence at a given
   * irradiance — the inverse of fluence(). Irradiance 0 never reaches a
   * positive target, so returns Infinity.
   */
  function secondsForFluence(targetFluenceJcm2, irradianceMwCm2) {
    if (!isFiniteNumber(targetFluenceJcm2) || targetFluenceJcm2 < 0) {
      throw new Error("target fluence must be a non-negative number");
    }
    if (!isFiniteNumber(irradianceMwCm2) || irradianceMwCm2 < 0) {
      throw new Error("irradiance must be a non-negative number");
    }
    if (irradianceMwCm2 === 0) return targetFluenceJcm2 === 0 ? 0 : Infinity;
    return (targetFluenceJcm2 * 1000) / irradianceMwCm2;
  }

  /**
   * Schematic Arndt-Schulz relative response for a fluence, on a log-dose
   * axis. Returns a unitless value in [0, 1] that peaks near the proliferation
   * dose and falls off below threshold and into the inhibitory region above.
   *
   * NOT a predictive model. A log-Gaussian bump chosen purely to render the
   * biphasic shape: below threshold ~ nothing, above it ~ inhibition.
   * @param {number} fluenceJcm2
   * @returns {number} relative response in [0, 1]
   */
  function relativeResponse(fluenceJcm2) {
    if (!isFiniteNumber(fluenceJcm2) || fluenceJcm2 <= 0) return 0;
    var logD = Math.log10(fluenceJcm2);
    var logPeak = Math.log10(PROLIFERATION_PEAK);
    var width = 0.62; // decades; controls how fast it falls off either side
    var z = (logD - logPeak) / width;
    return Math.exp(-0.5 * z * z);
  }

  /**
   * Classify a dose against the therapeutic windows. Returns a zone plus
   * whether irradiance and fluence each sit in their commonly-cited band.
   * This is the deterministic, scriptable surface — "is fluence in [1,20]?"
   * is a boolean, so it lives in code, not a prompt (WR-4200 boundary rule).
   */
  function classify(irradianceMwCm2, exposureSeconds) {
    var f = fluence(irradianceMwCm2, exposureSeconds);
    var irradianceInBand =
      irradianceMwCm2 >= IRRADIANCE_WINDOW.min &&
      irradianceMwCm2 <= IRRADIANCE_WINDOW.max;
    var fluenceInBand =
      f >= FLUENCE_WINDOW.min && f <= FLUENCE_WINDOW.max;
    var zone;
    if (f < FLUENCE_WINDOW.min) {
      zone = "subthreshold"; // below the window — "nothing"
    } else if (f > FLUENCE_WINDOW.max) {
      zone = "inhibitory"; // past the window — the descending limb
    } else {
      zone = "therapeutic";
    }
    return {
      fluenceJcm2: f,
      zone,
      irradianceInBand,
      fluenceInBand,
      relativeResponse: relativeResponse(f),
    };
  }

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }

  return {
    FLUENCE_WINDOW,
    IRRADIANCE_WINDOW,
    PROLIFERATION_PEAK,
    fluence,
    totalJoules,
    secondsForFluence,
    relativeResponse,
    classify,
  };
});
