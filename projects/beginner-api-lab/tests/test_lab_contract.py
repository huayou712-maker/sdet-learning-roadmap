"""Maintainer target-contract tests; learners write their own exercise suite."""
import pytest
import requests
from lab_server import registration_server


@pytest.mark.parametrize("age", [18, 120])
def test_valid_age_boundaries(api, base_url, age):
    result = api.post(base_url + "/users", json={"username": "abc", "age": age}, timeout=2)
    assert result.status_code == 201
    assert result.json()["age"] == age


@pytest.mark.parametrize("age", [17, 121, -1, 18.5, "18", True, None])
def test_invalid_age(api, base_url, age):
    result = api.post(base_url + "/users", json={"username": "abc", "age": age}, timeout=2)
    assert result.status_code == 400
    assert result.json() == {"error": "invalid_age"}
    assert api.get(base_url + "/users", timeout=2).json() == {"users": []}


@pytest.mark.parametrize("username", ["ab", "x" * 21, "a b", "", "汉字名", None, 123])
def test_invalid_username(api, base_url, username):
    result = api.post(base_url + "/users", json={"username": username, "age": 18}, timeout=2)
    assert result.status_code == 400
    assert result.json() == {"error": "invalid_username"}
    assert api.get(base_url + "/users", timeout=2).json() == {"users": []}


@pytest.mark.parametrize("username", ["abc", "x" * 20])
def test_valid_username_boundaries(api, base_url, username):
    result = api.post(base_url + "/users", json={"username": username, "age": 18}, timeout=2)
    assert result.status_code == 201
    assert result.json()["username"] == username


@pytest.mark.parametrize("payload", [{}, {"username": "abc"}, {"age": 18},
                                      {"username": "abc", "age": 18, "extra": 1}, [], None])
def test_wrong_shape(api, base_url, payload):
    import json
    result = api.post(base_url + "/users", data=json.dumps(payload),
                      headers={"Content-Type": "application/json"}, timeout=2)
    assert result.status_code == 400
    assert result.json() == {"error": "invalid_fields"}
    assert api.get(base_url + "/users", timeout=2).json() == {"users": []}


def test_bad_json_and_media_type(api, base_url):
    response = api.post(base_url + "/users", data="{",
                        headers={"Content-Type": "application/json"}, timeout=2)
    assert response.status_code == 400
    assert response.json() == {"error": "invalid_json"}
    response = api.post(base_url + "/users", data="plain text", timeout=2)
    assert response.status_code == 415
    assert response.json() == {"error": "json_required"}
    assert api.get(base_url + "/users", timeout=2).json() == {"users": []}


def test_unknown_route(api, base_url):
    assert api.get(base_url + "/missing", timeout=2).status_code == 404
    assert api.post(base_url + "/missing", json={}, timeout=2).status_code == 404


def test_instances_are_isolated_and_closed(api):
    with registration_server() as one:
        result = api.post(one + "/users", json={"username": "abc", "age": 18}, timeout=2)
        assert result.status_code == 201
        with registration_server() as two:
            assert one != two
            assert api.get(two + "/users", timeout=2).json() == {"users": []}
        with pytest.raises(requests.ConnectionError):
            api.get(two + "/users", timeout=2)
