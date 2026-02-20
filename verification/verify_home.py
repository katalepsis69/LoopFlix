from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("http://localhost:8080/index.html")

        print("Waiting for initial load...")
        page.wait_for_selector("#movies-list .card", timeout=10000)

        print("Waiting for genre rows content...")
        # Check for specific headings added by loadExtraRows
        try:
            page.wait_for_selector("h2:has-text('Popular This Week')", timeout=10000)
            page.wait_for_selector("h2:has-text('Top Rated All Time')", timeout=10000)
            page.wait_for_selector("h2:has-text('New Releases')", timeout=10000)
            print("Extra rows found!")
        except Exception as e:
            print(f"Error finding extra rows: {e}")
            page.screenshot(path="verification/error.png")
            browser.close()
            return

        # Check for genre rows (lazy loaded but we might trigger them by scrolling or just waiting)
        # lazyLoadGenreRows uses IntersectionObserver on #genre-rows
        # We need to scroll to it.
        genre_rows = page.locator("#genre-rows")
        genre_rows.scroll_into_view_if_needed()

        # Wait for genre content
        try:
            # Action & Adventure is the first genre
            page.wait_for_selector("h2:has-text('Action & Adventure')", timeout=10000)
            print("Genre rows found!")
        except Exception as e:
            print(f"Error finding genre rows: {e}")

        time.sleep(2) # Allow images to load

        page.screenshot(path="verification/home.png", full_page=True)
        print("Screenshot saved to verification/home.png")

        browser.close()

if __name__ == "__main__":
    run()
