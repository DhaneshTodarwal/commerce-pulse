"""Validate the generated CommercePulse snapshot before it is published."""

from __future__ import annotations

import json
from pathlib import Path

import pandas as pd


ROOT = Path(__file__).resolve().parents[1]
ORDERS = ROOT / "data" / "orders.csv"
METRICS = ROOT / "data" / "metrics.json"
REQUIRED_COLUMNS = {
    "date", "month", "month_label", "region", "category", "channel",
    "revenue", "cost", "orders", "returns", "rating", "marketing_spend",
    "gross_profit", "gross_margin",
}


def validate() -> dict[str, object]:
    frame = pd.read_csv(ORDERS)
    snapshot = json.loads(METRICS.read_text(encoding="utf-8"))
    missing = sorted(REQUIRED_COLUMNS - set(frame.columns))
    if missing:
        raise AssertionError(f"Missing columns: {', '.join(missing)}")
    if frame.empty:
        raise AssertionError("The order snapshot is empty")
    if frame.duplicated(["date", "region", "category"]).any():
        raise AssertionError("Duplicate date/region/category rows detected")
    numeric = ["revenue", "cost", "orders", "returns", "marketing_spend", "gross_profit", "gross_margin"]
    if frame[numeric].isna().any().any():
        raise AssertionError("Numeric columns contain null values")
    if (frame[numeric] < 0).any().any():
        raise AssertionError("Numeric columns contain negative values")
    if not frame["gross_margin"].between(0, 100).all():
        raise AssertionError("Gross margin is outside the expected 0-100 range")
    if snapshot.get("recordCount") != len(frame):
        raise AssertionError("metrics.json recordCount does not match orders.csv")
    headline = snapshot.get("headline", {})
    if headline.get("totalRevenue") != int(frame["revenue"].sum()):
        raise AssertionError("Headline revenue does not match orders.csv")
    return {
        "rows": int(len(frame)),
        "regions": sorted(frame["region"].unique().tolist()),
        "categories": sorted(frame["category"].unique().tolist()),
        "revenue": int(frame["revenue"].sum()),
        "gross_margin": round(float(frame["gross_profit"].sum() / frame["revenue"].sum() * 100), 2),
    }


if __name__ == "__main__":
    result = validate()
    print(json.dumps({"status": "passed", **result}, indent=2))
