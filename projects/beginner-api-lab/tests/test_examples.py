"""Maintainer-worked examples. A green result does not certify learner completion."""


def test_register_adult(api, base_url):
    response = api.post(base_url + "/users", json={"username": "learner_1", "age": 18}, timeout=2)
    assert response.status_code == 201
    assert response.json() == {"id": 1, "username": "learner_1", "age": 18}
    listing = api.get(base_url + "/users", timeout=2)
    assert listing.status_code == 200
    assert listing.json() == {"users": [response.json()]}


def test_underage_is_rejected_without_creating_data(api, base_url):
    response = api.post(base_url + "/users", json={"username": "learner_1", "age": 17}, timeout=2)
    assert response.status_code == 400
    assert response.json() == {"error": "invalid_age"}
    assert api.get(base_url + "/users", timeout=2).json() == {"users": []}


def test_duplicate_keeps_original_user(api, base_url):
    payload = {"username": "learner_1", "age": 20}
    original = api.post(base_url + "/users", json=payload, timeout=2)
    assert original.status_code == 201
    response = api.post(base_url + "/users", json=payload, timeout=2)
    assert response.status_code == 409
    assert response.json() == {"error": "username_taken"}
    assert api.get(base_url + "/users", timeout=2).json() == {"users": [original.json()]}


def test_every_test_starts_with_empty_data(api, base_url):
    response = api.get(base_url + "/users", timeout=2)
    assert response.status_code == 200
    assert response.json() == {"users": []}
