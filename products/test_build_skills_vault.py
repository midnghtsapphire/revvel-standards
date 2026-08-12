import pytest
from products.build_skills_vault import (
    category_name,
    group_skills_by_category,
    format_skill_title,
    format_skill_persona,
    format_skill_triggers
)

def test_category_name():
    assert category_name({}) == "Other"
    assert category_name({"category": "Dev"}) == "Dev"

def test_group_skills_by_category():
    skills = [
        {"name": "Skill 1", "category": "A"},
        {"name": "Skill 2", "category": "B"},
        {"name": "Skill 3", "category": "A"},
        {"name": "Skill 4"},
    ]
    order, groups = group_skills_by_category(skills)
    assert order == ["A", "B", "Other"]
    assert len(groups) == 3
    assert len(groups["A"]) == 2
    assert groups["A"][0]["name"] == "Skill 1"
    assert groups["A"][1]["name"] == "Skill 3"
    assert len(groups["B"]) == 1
    assert groups["B"][0]["name"] == "Skill 2"
    assert len(groups["Other"]) == 1
    assert groups["Other"][0]["name"] == "Skill 4"

def test_format_skill_title():
    assert format_skill_title({"title": "Best Title"}) == "Best Title"
    assert format_skill_title({"name": "Fallback Name"}) == "Fallback Name"
    assert format_skill_title({"title": "Best Title", "name": "Fallback Name"}) == "Best Title"
    assert format_skill_title({}) == ""

def test_format_skill_persona():
    assert format_skill_persona({"persona": "Developer"}) == "Persona: Developer"
    assert format_skill_persona({}) is None

def test_format_skill_triggers():
    assert format_skill_triggers({"triggers": ["one", "two", "three", "four", "five", "six", "seven"]}) == "Triggers: one, two, three, four, five, six"
    assert format_skill_triggers({"triggers": ["one"]}) == "Triggers: one"
    assert format_skill_triggers({}) is None
