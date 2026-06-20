\x on
\echo === LATEST SIGNAL ROW ID + the calibration row linkage ===
SELECT id AS signal_result_id, "generatedAt", "generatedDate", score, "modelVersion"
FROM signal_results WHERE "instrumentId"='cmo8zraft00bpw5ekp6554sgq'
ORDER BY "generatedAt" DESC LIMIT 1;

\echo === WHICH signalResultId does each STARHEALTH calibration row point to + that signal's generatedDate/modelVersion ===
SELECT cr."generatedAt" AS calib_gen, cr."calibratedScore", cr."calibrationModelVersion",
       cr."signalResultId", sr."generatedDate" AS signal_gendate, sr."modelVersion" AS signal_model, sr.score AS signal_score
FROM signal_calibration_results cr
JOIN signal_results sr ON sr.id = cr."signalResultId"
WHERE sr."instrumentId"='cmo8zraft00bpw5ekp6554sgq'
ORDER BY cr."generatedAt" DESC LIMIT 6;
