-- CommercePulse analytical contract
--
-- The published dashboard uses data/metrics.json for a fast static demo. This
-- file makes the analytical layer reviewable in SQL and gives the project a
-- clear path from a portfolio snapshot to a warehouse-backed product.
-- The queries are written for DuckDB/PostgreSQL-style SQL.

CREATE TABLE orders (
    order_date DATE NOT NULL,
    month INTEGER NOT NULL,
    month_label VARCHAR(3) NOT NULL,
    region VARCHAR(32) NOT NULL,
    category VARCHAR(64) NOT NULL,
    channel VARCHAR(32) NOT NULL,
    revenue DECIMAL(14, 2) NOT NULL,
    cost DECIMAL(14, 2) NOT NULL,
    orders INTEGER NOT NULL,
    returns INTEGER NOT NULL,
    rating DECIMAL(4, 2),
    marketing_spend DECIMAL(14, 2) NOT NULL,
    gross_profit DECIMAL(14, 2) NOT NULL,
    gross_margin DECIMAL(6, 2) NOT NULL
);

-- DuckDB example loader:
-- CREATE TABLE orders AS
-- SELECT * FROM read_csv_auto('data/orders.csv', header = true, sample_size = -1);

-- Executive KPI readout.
SELECT
    SUM(revenue) AS net_revenue,
    SUM(orders) AS order_count,
    SUM(gross_profit) AS gross_profit,
    ROUND(SUM(gross_profit) / NULLIF(SUM(revenue), 0) * 100, 2) AS gross_margin_pct,
    ROUND(SUM(revenue) / NULLIF(SUM(orders), 0), 2) AS average_order_value,
    ROUND(SUM(returns) / NULLIF(SUM(orders), 0) * 100, 2) AS return_rate_pct
FROM orders;

-- Category performance with an explicit decision lens.
SELECT
    category,
    SUM(revenue) AS revenue,
    SUM(gross_profit) AS gross_profit,
    ROUND(SUM(gross_profit) / NULLIF(SUM(revenue), 0) * 100, 2) AS margin_pct,
    SUM(orders) AS orders,
    SUM(returns) AS returns
FROM orders
GROUP BY category
ORDER BY revenue DESC;

-- Regional share and channel mix.
SELECT
    region,
    channel,
    SUM(revenue) AS revenue,
    ROUND(SUM(revenue) / SUM(SUM(revenue)) OVER () * 100, 2) AS revenue_share_pct
FROM orders
GROUP BY region, channel
ORDER BY revenue DESC;

-- Monthly trend with a simple three-period moving average.
WITH monthly AS (
    SELECT
        month,
        month_label,
        SUM(revenue) AS revenue,
        SUM(orders) AS orders
    FROM orders
    GROUP BY month, month_label
)
SELECT
    month,
    month_label,
    revenue,
    orders,
    ROUND(AVG(revenue) OVER (ORDER BY month ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 2) AS revenue_3m_avg
FROM monthly
ORDER BY month;
