"""No network traffic: verify calendar URL policy before downloading feeds."""
import socket
import unittest
from unittest.mock import patch
from fastapi import HTTPException
from backend.api.routes.calendar_feeds import validate_url


class CalendarUrlTests(unittest.TestCase):
    def test_public_webcal_host(self):
        answers=[(socket.AF_INET,socket.SOCK_STREAM,6,"",("93.184.215.14",443))]
        with patch("backend.api.routes.calendar_feeds.socket.getaddrinfo",return_value=answers):
            url,host,address=validate_url("webcal://events.example.org/feed.ics")
        self.assertEqual(url,"https://events.example.org/feed.ics")
        self.assertEqual(host,"events.example.org")
        self.assertEqual(address,"93.184.215.14")

    def test_reject_private_addresses(self):
        answers=[(socket.AF_INET,socket.SOCK_STREAM,6,"",("127.0.0.1",443))]
        with patch("backend.api.routes.calendar_feeds.socket.getaddrinfo",return_value=answers):
            with self.assertRaises(HTTPException):
                validate_url("https://calendar.example.org/feed")

    def test_reject_mixed_dns_answers(self):
        answers=[
            (socket.AF_INET,socket.SOCK_STREAM,6,"",("93.184.215.14",443)),
            (socket.AF_INET,socket.SOCK_STREAM,6,"",("10.0.0.5",443))]
        with patch("backend.api.routes.calendar_feeds.socket.getaddrinfo",return_value=answers):
            with self.assertRaises(HTTPException):
                validate_url("https://calendar.example.org/feed")

    def test_reject_non_https_or_nonstandard_port(self):
        for url in ("http://events.example.org/a.ics",
                    "https://events.example.org:8443/a.ics",
                    "https://user:pass@events.example.org/a.ics"):
            with self.assertRaises(HTTPException):
                validate_url(url)


if __name__=="__main__":
    unittest.main()
