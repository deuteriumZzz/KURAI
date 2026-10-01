import uuid


class RequestIdMiddleware:
    """Attach a safe correlation identifier to every HTTP response."""

    header_name = "X-Request-ID"

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        supplied = request.headers.get(self.header_name, "")
        try:
            request_id = str(uuid.UUID(supplied))
        except (ValueError, AttributeError):
            request_id = str(uuid.uuid4())
        request.request_id = request_id
        response = self.get_response(request)
        response[self.header_name] = request_id
        return response
