# CommercePulse

CommercePulse is a decision-ready retail analytics dashboard built as a portfolio project for Dhanesh Todarwal. It turns a clean, reproducible FY 2025 demo dataset into an interactive view of revenue, orders, margin, returns, product mix, and regional performance.

The project is deliberately transparent: the dashboard uses a generated demo snapshot, not live customer or market data. The point is to show the full analytics workflow and the thinking behind a business-facing recommendation.

## What it demonstrates

- Python and pandas data generation, cleaning, feature engineering, and aggregation
- A reviewable SQL analytical contract in `sql/commercepulse.sql`
- A publish-time data-quality gate in `scripts/validate_snapshot.py`
- A reusable JSON snapshot for a fast static dashboard
- Interactive region, category, and period filters
- Revenue trend, category mix, regional share, margin, returns, and AOV analysis
- Accessible responsive HTML/CSS/JavaScript with no frontend framework dependency
- GitHub Actions deployment to GitHub Pages

## Run it locally

```bash
python -m pip install -r requirements.txt
python scripts/build_snapshot.py
python -m http.server 8000
```

Open `http://localhost:8000`.

## Data workflow

1. `scripts/build_snapshot.py` creates a deterministic, fictional order-level dataset for FY 2025.
2. The script normalizes numeric columns, derives gross profit and gross margin, and writes `data/orders.csv`.
3. It aggregates the rows into `data/metrics.json` for the browser.
4. The dashboard recalculates its views in the browser as filters change.

## Analytics engineering layer

The dashboard remains intentionally static for GitHub Pages, but the repository now includes a SQL contract for the same business questions. `sql/commercepulse.sql` documents the orders schema, executive KPI readout, category performance, regional/channel mix, and monthly trend query. The GitHub Actions workflow runs `scripts/validate_snapshot.py` after rebuilding the snapshot so duplicate keys, null measures, invalid margins, and headline mismatches fail before publication.

The next production step would be replacing the fictional snapshot with an approved warehouse or API source, adding source freshness checks, and publishing the same metrics through a governed BI layer. The current public numbers remain demonstration data.

## Project story

The product question is simple: *where is the business winning, and what deserves the next decision?* CommercePulse answers that with a compact executive view instead of a wall of charts. Every card has a business meaning, every filter changes the story, and the methodology is visible so the analysis can be trusted.

## Author

Dhanesh Todarwal — Data Science learner, Python developer, and product builder.

- Portfolio: https://dhanesh-todarwal-portfolio.yogi-workspace-in.chatgpt.site/
- GitHub: https://github.com/DhaneshTodarwal
- LinkedIn: https://www.linkedin.com/in/dhanesh-todarwal-a82556246
