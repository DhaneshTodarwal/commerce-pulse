"""Build the reproducible CommercePulse demo snapshot."""

from __future__ import annotations

import json
from pathlib import Path

import pandas as pd


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
ORDERS_PATH = DATA_DIR / "orders.csv"
METRICS_PATH = DATA_DIR / "metrics.json"

MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]
REGIONS = ["North", "West", "South", "East"]
CATEGORIES = ["Electronics", "Home", "Grocery", "Beauty", "Fitness"]
CHANNELS = ["Direct", "Marketplace", "Retail"]


def generate_rows() -> list[dict]:
    category_revenue = {"Electronics": 264000, "Home": 198000, "Grocery": 171000, "Beauty": 146000, "Fitness": 121000}
    category_aov = {"Electronics": 6200, "Home": 3500, "Grocery": 1450, "Beauty": 2100, "Fitness": 2800}
    category_cost_rate = {"Electronics": 0.73, "Home": 0.61, "Grocery": 0.69, "Beauty": 0.51, "Fitness": 0.57}
    category_return_rate = {"Electronics": 0.045, "Home": 0.034, "Grocery": 0.018, "Beauty": 0.026, "Fitness": 0.031}
    region_factor = {"North": 1.08, "West": 1.18, "South": 0.96, "East": 0.86}
    seasonality = [0.94, 0.91, 0.98, 1.01, 1.04, 1.03, 1.00, 1.05, 1.09, 1.14, 1.23, 1.31]
    rows: list[dict] = []

    for month in range(1, 13):
        for region_index, region in enumerate(REGIONS):
            for category_index, category in enumerate(CATEGORIES):
                growth = 0.96 + month * 0.011
                channel = CHANNELS[(month + region_index + category_index) % len(CHANNELS)]
                revenue = round(category_revenue[category] * region_factor[region] * seasonality[month - 1] * growth)
                revenue += (region_index * 3200) + (category_index * 1800)
                orders = round(revenue / category_aov[category])
                cost_rate = category_cost_rate[category] + ((region_index - 1.5) * 0.006)
                cost = round(revenue * cost_rate)
                return_rate = category_return_rate[category] + (0.002 if channel == "Marketplace" else 0)
                returns = round(orders * return_rate)
                rating = round(4.12 + (category_index * 0.08) + (month * 0.012) - (0.04 if channel == "Marketplace" else 0), 2)
                marketing_spend = round(revenue * (0.061 + (0.008 if channel == "Direct" else 0.015)))
                rows.append({
                    "date": f"2025-{month:02d}-01",
                    "month": month,
                    "month_label": MONTHS[month - 1],
                    "region": region,
                    "category": category,
                    "channel": channel,
                    "revenue": revenue,
                    "cost": cost,
                    "orders": orders,
                    "returns": returns,
                    "rating": rating,
                    "marketing_spend": marketing_spend,
                })
    return rows


def build_snapshot() -> dict:
    frame = pd.DataFrame(generate_rows())
    numeric_columns = ["revenue", "cost", "orders", "returns", "rating", "marketing_spend"]
    frame[numeric_columns] = frame[numeric_columns].apply(pd.to_numeric, errors="coerce").fillna(0)
    frame = frame.drop_duplicates(subset=["date", "region", "category"]).sort_values(["date", "region", "category"])
    frame["gross_profit"] = frame["revenue"] - frame["cost"]
    frame["gross_margin"] = (frame["gross_profit"] / frame["revenue"] * 100).round(2)

    export_frame = frame.copy()
    export_frame.to_csv(ORDERS_PATH, index=False)
    records = []
    for record in frame.to_dict(orient="records"):
        records.append({
            **record,
            "monthLabel": record["month_label"],
            "revenue": int(record["revenue"]),
            "cost": int(record["cost"]),
            "orders": int(record["orders"]),
            "returns": int(record["returns"]),
            "rating": float(record["rating"]),
            "marketingSpend": int(record["marketing_spend"]),
            "grossProfit": int(record["gross_profit"]),
            "grossMargin": float(record["gross_margin"]),
        })
        records[-1].pop("marketing_spend")
        records[-1].pop("gross_profit")
        records[-1].pop("month_label")

    by_category = frame.groupby("category", as_index=False).agg(revenue=("revenue", "sum"), cost=("cost", "sum"), orders=("orders", "sum"))
    by_region = frame.groupby("region", as_index=False).agg(revenue=("revenue", "sum"))
    top_category = by_category.sort_values("revenue", ascending=False).iloc[0]
    top_region = by_region.sort_values("revenue", ascending=False).iloc[0]

    return {
        "generatedAt": "2026-08-27",
        "datasetLabel": "FY 2025 DEMO SNAPSHOT",
        "sourceNote": "Deterministic fictional order rows generated for portfolio demonstration.",
        "recordCount": int(len(frame)),
        "filters": {"regions": REGIONS, "categories": CATEGORIES, "months": MONTHS},
        "headline": {
            "topCategory": str(top_category["category"]),
            "topRegion": str(top_region["region"]),
            "totalRevenue": int(frame["revenue"].sum()),
            "grossMargin": float((frame["gross_profit"].sum() / frame["revenue"].sum() * 100).round(2)),
        },
        "records": records,
    }


def main() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    snapshot = build_snapshot()
    METRICS_PATH.write_text(json.dumps(snapshot, indent=2), encoding="utf-8")
    print(f"Wrote {snapshot['recordCount']} rows to {ORDERS_PATH}")
    print(f"Wrote browser snapshot to {METRICS_PATH}")


if __name__ == "__main__":
    main()
