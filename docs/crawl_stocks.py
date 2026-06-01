#!/usr/bin/env python3
"""
Crawl dzengi.com tokenized stocks pages and extract company information to CSV.
Stocks are classified by sector/type and sorted by type in the output.
"""

import csv
import re
import requests
import time
from bs4 import BeautifulSoup

BASE_URL = "https://dzengi.com/ru/tokenizirovannye-akcii"
PAGES = [""] + [f"/{i}" for i in range(2, 11)]  # 1-10 pages

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
}

# Known stock type classification by ticker
STOCK_TYPES = {
    # Technology
    "INTC": "Technology",
    "NVDA": "Technology",
    "AMD": "Technology",
    "MSFT": "Technology",
    "META": "Technology",
    "AAPL": "Technology",
    "GOOG": "Technology",
    "GOOGL": "Technology",
    "TSM": "Technology",
    "MU": "Technology",
    "EPAM": "Technology",
    "NOK": "Technology",
    "CSCO": "Technology",
    "ORCL": "Technology",
    "IBM": "Technology",
    "QCOM": "Technology",
    "SNAP": "Technology",
    "PLTR": "Technology",
    "UBER": "Technology",
    "SQ": "Technology",
    "TWTR": "Technology",
    "ZM": "Technology",
    "CRM": "Technology",
    "ADBE": "Technology",
    "PYPL": "Technology",
    "NET": "Technology",
    "SHOP": "Technology",
    "SAP": "Technology",
    "ASML": "Technology",
    "HPE": "Technology",
    "HPQ": "Technology",
    "STX": "Technology",
    "CRWD": "Technology",
    "DDOG": "Technology",
    "SNOW": "Technology",
    "GTLB": "Technology",
    "FROG": "Technology",
    "FSLY": "Technology",
    "DBX": "Technology",
    "DOCU": "Technology",
    "NTNX": "Technology",
    "MDB": "Technology",
    "BB": "Technology",
    "BILL": "Technology",
    "U": "Technology",
    "UPST": "Technology",
    "MTTR": "Technology",
    "ARQQ": "Technology",
    "KOPN": "Technology",
    "WATT": "Technology",
    "DJT": "Technology",
    "VNET": "Technology",
    "DASH": "Technology",
    # E-commerce / Internet
    "AMZN": "E-commerce",
    "BABA": "E-commerce",
    "JD": "E-commerce",
    "EBAY": "E-commerce",
    "ETSY": "E-commerce",
    "JMIA": "E-commerce",
    "CPNG": "E-commerce",
    "VIPS": "E-commerce",
    "BZUN": "E-commerce",
    "LOGCus": "E-commerce",
    "BYND": "Consumer",
    # Entertainment / Streaming / Media
    "NFLX": "Entertainment",
    "DIS": "Entertainment",
    "RBLX": "Entertainment",
    "SKLZ": "Entertainment",
    "GME": "Entertainment",
    "EA": "Entertainment",
    "ATVI": "Entertainment",
    "AMC": "Entertainment",
    "CNK": "Entertainment",
    "SPOT": "Entertainment",
    "IQ": "Entertainment",
    "FUBO": "Entertainment",
    "BILI": "Entertainment",
    "PLTK": "Entertainment",
    "DKNG": "Entertainment",
    "SNE": "Entertainment",
    "GPRO": "Entertainment",
    "MOMO": "Entertainment",
    # Social Media / Communication
    "PINS": "Communication",
    "LUMN": "Telecom",
    "TIT": "Telecom",
    # Automotive
    "TSLA": "Automotive",
    "F": "Automotive",
    "GM": "Automotive",
    "NIO": "Automotive",
    "VOW3": "Automotive",
    "LCID": "Automotive",
    "RIVN": "Automotive",
    "HYLN": "Automotive",
    "LIus": "Automotive",
    "XPEV": "Automotive",
    "BMW": "Automotive",
    "WKHS": "Automotive",
    "GT": "Automotive",
    "QS": "Automotive",
    "MVST": "Automotive",
    # Airlines / Travel
    "LHA": "Airlines",
    "AAL": "Airlines",
    "DAL": "Airlines",
    "UAL": "Airlines",
    "AFp": "Airlines",
    "ICAG": "Airlines",
    "NCLH": "Travel",
    "CCL": "Travel",
    "TUI1": "Travel",
    "ABNB": "Travel",
    # Aerospace / Defense
    "SPCE": "Aerospace",
    "BA": "Aerospace",
    "LMT": "Aerospace",
    "RTX": "Aerospace",
    "SPR": "Aerospace",
    # Finance / Crypto
    "COIN": "Finance",
    "BGN": "Finance",
    "DBK": "Finance",
    "GS": "Finance",
    "JPM": "Finance",
    "BAC": "Finance",
    "C": "Finance",
    "V": "Finance",
    "MA": "Finance",
    "MARA": "Finance",
    "RIOT": "Finance",
    "HOOD": "Finance",
    "SOS": "Finance",
    "MSTR": "Finance",
    "WFC": "Finance",
    "ITUB": "Finance",
    "RBSl": "Finance",
    "SOFI": "Finance",
    "PSFE": "Finance",
    "AFRM": "Finance",
    "MQ": "Finance",
    "BKKT": "Finance",
    "BTBT": "Finance",
    "LX": "Finance",
    "NCTY": "Finance",
    "YRD": "Finance",
    # Energy
    "FCEL": "Energy",
    "BLDP": "Energy",
    "PLUG": "Energy",
    "BE": "Energy",
    "XOM": "Energy",
    "CVX": "Energy",
    "BP": "Energy",
    "ENPH": "Energy",
    "NEE": "Energy",
    "RDS": "Energy",
    "SPWR": "Energy",
    "RUN": "Energy",
    "DVN": "Energy",
    "ET": "Energy",
    "OXY": "Energy",
    "SWN": "Energy",
    "RIG": "Energy",
    "A2A": "Energy",
    "UN0": "Energy",
    # Pharma / Biotech
    "MRNA": "Pharma",
    "NVAX": "Pharma",
    "PFE": "Pharma",
    "JNJ": "Pharma",
    "BNTX": "Pharma",
    "AZN": "Pharma",
    "BMY": "Pharma",
    "ABBV": "Pharma",
    "LLY": "Pharma",
    "OCGN": "Pharma",
    "INO": "Pharma",
    "BIIB": "Pharma",
    "ABCL": "Pharma",
    "BLUE": "Pharma",
    "BNGO": "Pharma",
    "CGEN": "Pharma",
    "CLOV": "Pharma",
    "CRIS": "Pharma",
    "EXAS": "Pharma",
    "LGVN": "Pharma",
    "NKTR": "Pharma",
    "PBYI": "Pharma",
    "PHAR": "Pharma",
    "QDEL": "Pharma",
    "SNY": "Pharma",
    "TEVA": "Pharma",
    "VIR": "Pharma",
    "VLA": "Pharma",
    "ZLAB": "Pharma",
    "ZNTL": "Pharma",
    "EW": "Pharma",
    # Consumer / Retail
    "KO": "Consumer",
    "PEP": "Consumer",
    "WMT": "Consumer",
    "NKE": "Consumer",
    "SBUX": "Consumer",
    "MCD": "Consumer",
    "PG": "Consumer",
    "COST": "Consumer",
    "ATER": "Consumer",
    "M": "Consumer",
    "GAP": "Consumer",
    "PTON": "Consumer",
    "ADS.DE": "Consumer",
    "BIG": "Consumer",
    "APRN": "Consumer",
    "WW": "Consumer",
    "BRCC": "Consumer",
    # Telecom
    "T": "Telecom",
    "VZ": "Telecom",
    "TMUS": "Telecom",
    # ETF
    "TQQQ": "ETF",
    "UVXY": "ETF",
    "SQQQ": "ETF",
    "SPY": "ETF",
    "QQQ": "ETF",
    "ARKK": "ETF",
    "ARKG": "ETF",
    "SOXL": "ETF",
    "SOXS": "ETF",
    "BITO": "ETF",
    "DRIV": "ETF",
    "ICLN": "ETF",
    "LIT": "ETF",
    "MCHI": "ETF",
    "MJ": "ETF",
    "PBD": "ETF",
    "SPXU": "ETF",
    "TAN": "ETF",
    "TLT": "ETF",
    "VOO": "ETF",
    "YOLO": "ETF",
    # Education
    "COUR": "Education",
    "EDU": "Education",
    "TAL": "Education",
    "UDMY": "Education",
    # Real Estate
    "AIV": "Real Estate",
    "Z": "Real Estate",
    # Mining / Materials
    "AA": "Materials",
    "AG": "Materials",
    "CLF": "Materials",
    "MOS": "Materials",
    "NEM": "Materials",
    "VALE": "Materials",
    "PNR": "Materials",
    # Sports
    "JUVE": "Entertainment",
    # Freelance / Services
    "FVRR": "Technology",
    # Healthcare
    "GOCO": "Healthcare",
    "ORP": "Healthcare",
    # Cannabis
    "CRON": "Cannabis",
    "TLRY": "Cannabis",
    # Construction / Industrial
    "OHL": "Industrial",
    "NOEJ": "Industrial",
    # Search / Internet (China)
    "BIDU": "Technology",
    "OCFT": "Technology",
    "YMM": "Technology",
}


def fetch_page(url):
    """Fetch and parse a single page."""
    try:
        response = requests.get(url, headers=HEADERS, timeout=30)
        response.raise_for_status()
        return BeautifulSoup(response.text, 'html.parser')
    except Exception as e:
        print(f"Error fetching {url}: {e}")
        return None


def extract_stocks(soup):
    """Extract stock information from the page by finding stock links."""
    stocks = []

    # Stock links follow pattern: href contains "tokenizirovannye-akcii-" or "tokenized-"
    # Link text contains "TICKER\n                                    Company Name"
    links = soup.find_all('a', href=True)
    for link in links:
        href = link.get('href', '')
        if not ('tokenizirovannye-akcii-' in href or 'tokenized-' in href):
            continue
        if href.endswith('/tokenizirovannye-akcii') or re.search(r'/tokenizirovannye-akcii/\d+$', href):
            continue
        # Skip non-stock links (language switcher etc.)
        if href.endswith('/tokenized-shares') or href.endswith('/acciones-tokenizadas') or href.endswith('/takenizavania-akzii'):
            continue

        text = link.get_text(separator='\n', strip=True)
        lines = [l.strip() for l in text.split('\n') if l.strip()]

        if len(lines) >= 2:
            ticker = lines[0].strip()
            name = lines[1].strip()
        elif len(lines) == 1:
            # Single line - might be just ticker or name
            ticker = lines[0].strip()
            name = ""
        else:
            continue

        if not ticker or not name:
            continue

        stock_type = classify_stock(ticker)
        stocks.append({
            'ticker': ticker,
            'name': name,
            'type': stock_type,
        })

    return stocks


def classify_stock(ticker):
    """Classify stock by its ticker using the known mapping."""
    return STOCK_TYPES.get(ticker, "Other")


def deduplicate_stocks(stocks):
    """Remove duplicate stocks based on ticker."""
    seen = set()
    unique = []
    for stock in stocks:
        key = stock['ticker'].upper()
        if key and key not in seen:
            seen.add(key)
            unique.append(stock)
    return unique


def main():
    all_stocks = []

    for page_suffix in PAGES:
        url = f"{BASE_URL}{page_suffix}"
        print(f"Fetching: {url}")

        soup = fetch_page(url)
        if soup:
            stocks = extract_stocks(soup)
            print(f"  Found {len(stocks)} stocks")
            all_stocks.extend(stocks)

        # Be polite, add small delay
        time.sleep(1)

    # Deduplicate
    all_stocks = deduplicate_stocks(all_stocks)
    print(f"\nTotal unique stocks: {len(all_stocks)}")

    # Sort by type, then by ticker within each type
    all_stocks.sort(key=lambda s: (s['type'], s['ticker']))

    # Write to CSV
    output_file = "tokenized_stocks.csv"
    with open(output_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['ticker', 'name', 'type'])
        writer.writeheader()
        writer.writerows(all_stocks)

    print(f"\nData saved to {output_file}")

    # Print summary by type
    type_counts = {}
    for s in all_stocks:
        type_counts[s['type']] = type_counts.get(s['type'], 0) + 1
    print("\nStocks by type:")
    for t in sorted(type_counts.keys()):
        print(f"  {t}: {type_counts[t]}")


if __name__ == "__main__":
    main()
