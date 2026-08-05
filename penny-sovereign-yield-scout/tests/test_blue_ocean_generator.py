import pytest
import sys
import os

# Add tools to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../tools')))

from blue_ocean_generator import render

def test_render_standard_replacement():
    template = "Hello, {{name}}! Welcome to {{place}}."
    context = {"name": "Alice", "place": "Wonderland"}
    expected = "Hello, Alice! Welcome to Wonderland."
    assert render(template, context) == expected

def test_render_multiple_occurrences():
    template = "{{name}} is here. Yes, {{name}} is really here."
    context = {"name": "Bob"}
    expected = "Bob is here. Yes, Bob is really here."
    assert render(template, context) == expected

def test_render_non_string_values():
    template = "The port is {{port}} and the score is {{score}}."
    context = {"port": 8080, "score": 0.95}
    expected = "The port is 8080 and the score is 0.95."
    assert render(template, context) == expected

def test_render_missing_context_keys():
    template = "Hello, {{name}}! How is {{other}}?"
    context = {"name": "Alice"}
    expected = "Hello, Alice! How is {{other}}?"
    assert render(template, context) == expected

def test_render_extra_context_keys():
    template = "Hello, {{name}}!"
    context = {"name": "Alice", "unused": "data"}
    expected = "Hello, Alice!"
    assert render(template, context) == expected

def test_render_empty_template():
    template = ""
    context = {"name": "Alice"}
    expected = ""
    assert render(template, context) == expected

def test_render_empty_context():
    template = "Hello, {{name}}!"
    context = {}
    expected = "Hello, {{name}}!"
    assert render(template, context) == expected
