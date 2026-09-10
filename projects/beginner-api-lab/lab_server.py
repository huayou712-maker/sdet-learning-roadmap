"""Synthetic registration target for testing practice. Never deploy this server."""

from contextlib import contextmanager
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import re
from threading import Thread

FAULTS = ("none", "age-boundary", "duplicate", "status-code")


@contextmanager
def registration_server(fault="none"):
    """Each instance owns a fresh in-memory store and a loopback-only random port."""
    if fault not in FAULTS:
        raise ValueError("Unknown teaching fault")
    users = []

    class Handler(BaseHTTPRequestHandler):
        def setup(self):
            super().setup()
            self.connection.settimeout(2)

        def log_message(self, *_args):
            pass  # No request payloads or personal data in logs.

        def reply(self, status, body):
            encoded = json.dumps(body).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(encoded)))
            self.end_headers()
            self.wfile.write(encoded)

        def do_GET(self):
            if self.path == "/users":
                self.reply(200, {"users": users})
            else:
                self.reply(404, {"error": "not_found"})

        def do_POST(self):
            if self.path != "/users":
                return self.reply(404, {"error": "not_found"})
            if self.headers.get_content_type() != "application/json":
                return self.reply(415, {"error": "json_required"})
            try:
                length = int(self.headers.get("Content-Length", "0"))
                if not 0 < length <= 4096:
                    return self.reply(400, {"error": "invalid_body"})
                payload = json.loads(self.rfile.read(length))
            except (ValueError, UnicodeDecodeError):
                return self.reply(400, {"error": "invalid_json"})
            if not isinstance(payload, dict) or set(payload) != {"username", "age"}:
                return self.reply(400, {"error": "invalid_fields"})
            username, age = payload["username"], payload["age"]
            if not isinstance(username, str) or re.fullmatch(r"[A-Za-z0-9_]{3,20}", username) is None:
                return self.reply(400, {"error": "invalid_username"})
            minimum_age = 17 if fault == "age-boundary" else 18
            if type(age) is not int or not minimum_age <= age <= 120:
                return self.reply(400, {"error": "invalid_age"})
            if any(user["username"] == username for user in users) and fault != "duplicate":
                return self.reply(409, {"error": "username_taken"})
            user = {"id": len(users) + 1, "username": username, "age": age}
            users.append(user)
            return self.reply(200 if fault == "status-code" else 201, user)

    with ThreadingHTTPServer(("127.0.0.1", 0), Handler) as server:
        worker = Thread(target=server.serve_forever, kwargs={"poll_interval": 0.02}, daemon=True)
        worker.start()
        try:
            yield "http://127.0.0.1:" + str(server.server_port)
        finally:
            server.shutdown()
            worker.join(timeout=2)
            if worker.is_alive():
                raise RuntimeError("Lab server did not stop")
