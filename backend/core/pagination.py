from rest_framework.pagination import PageNumberPagination


class DefaultPagination(PageNumberPagination):
    """Standard page-number pagination for all list endpoints (FR-10.3).

    Clients may override the page size with ``?page_size=`` up to a sane cap.
    """
    page_size_query_param = 'page_size'
    max_page_size = 1000
