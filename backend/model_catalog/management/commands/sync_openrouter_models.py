from django.core.management.base import BaseCommand, CommandError

from model_catalog.openrouter import OpenRouterCatalogError, fetch_catalog, fetch_video_catalog, sync_catalog


class Command(BaseCommand):
    help = "Fetch the current OpenRouter model catalog and pricing into the local registry."

    def handle(self, *args, **options):
        try:
            count = sync_catalog([*fetch_catalog(), *fetch_video_catalog()])
        except OpenRouterCatalogError as error:
            raise CommandError(str(error)) from error
        self.stdout.write(self.style.SUCCESS(f"Synced {count} OpenRouter models."))
