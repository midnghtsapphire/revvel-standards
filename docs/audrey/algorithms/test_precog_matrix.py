from docs.audrey.algorithms.precog_matrix import PrecognitiveMatrix

def test_pattern_recognition_empty_data():
    matrix = PrecognitiveMatrix()
    assert matrix.pattern_recognition([]) == []

def test_pattern_recognition_uptrend():
    matrix = PrecognitiveMatrix()
    data = [10, 20, 30, 40, 50]
    patterns = matrix.pattern_recognition(data)
    assert "uptrend" in patterns

def test_pattern_recognition_downtrend():
    matrix = PrecognitiveMatrix()
    data = [50, 40, 30, 20, 10]
    patterns = matrix.pattern_recognition(data)
    assert "downtrend" in patterns

def test_confidence_assessment():
    matrix = PrecognitiveMatrix()
    patterns = ["uptrend", "uptrend", "downtrend"]
    confidence = matrix.confidence_assessment(patterns)
    assert "uptrend" in confidence
    assert confidence["uptrend"] > 0
    assert confidence["downtrend"] > 0

def test_market_prediction_bullish():
    matrix = PrecognitiveMatrix()
    confidence_levels = {"uptrend": 0.8, "downtrend": 0.2}
    predictions = matrix.market_prediction(confidence_levels)
    assert "bullish" in predictions

def test_market_prediction_bearish():
    matrix = PrecognitiveMatrix()
    confidence_levels = {"uptrend": 0.2, "downtrend": 0.8}
    predictions = matrix.market_prediction(confidence_levels)
    assert "bearish" in predictions

def test_market_prediction_neutral():
    matrix = PrecognitiveMatrix()
    confidence_levels = {"uptrend": 0.5, "downtrend": 0.5}
    predictions = matrix.market_prediction(confidence_levels)
    assert "neutral" in predictions
