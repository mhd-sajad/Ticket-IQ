"""
Script to generate the mislabeled examples section in README.md directly from error_analysis.json and test.csv.
Enforces strict assertions verifying ticket_id, text, true label, and predicted label.
Also asserts that every TCK ID mentioned in README.md exists in test.csv with matching text.
"""
from pathlib import Path
import json
import re
import pandas as pd

BASE_DIR = Path(__file__).resolve().parent.parent
REPO_DIR = BASE_DIR.parent
DATA_DIR = BASE_DIR / "data" / "processed"
ARTIFACTS_DIR = BASE_DIR / "artifacts"
README_PATH = REPO_DIR / "README.md"


def map_4class(cat: str) -> str:
    if cat in ["Technical Support", "IT Support", "Product Support", "Technical"]:
        return "Technical"
    return str(cat)


def generate_mislabeled_markdown(error_data: dict, test_df: pd.DataFrame) -> str:
    test_by_id = test_df.set_index("ticket_id")

    # Select the two requested real examples: TCK-27513 (overconfident 0.92) and TCK-29058
    target_ids = ["TCK-27513", "TCK-29058"]
    cat_mis = {ex["ticket_id"]: ex for ex in error_data.get("category_misclassifications", [])}

    md_lines = []
    md_lines.append("2. **Dataset Label Inconsistencies (Audited from `error_analysis.json` & `test.csv`):**")
    md_lines.append("")

    for tid in target_ids:
        assert tid in cat_mis, f"Ticket ID {tid} not found in error_analysis.json"
        assert tid in test_by_id.index, f"Ticket ID {tid} not found in test.csv"

        ex = cat_mis[tid]
        row = test_by_id.loc[tid]

        # Strict equality assertions
        assert row["text"] == ex["full_text"], f"Text mismatch for {tid}"
        assert map_4class(row["category"]) == ex["true_label"], f"True label mismatch for {tid}"
        assert ex["predicted_label"] != ex["true_label"], f"Example {tid} was not misclassified!"

        top_words_str = ", ".join([f"`{w['word']}` ({w['weight']:+.4f})" for w in ex["top_contributing_words"][:4]])

        md_lines.append(f"   - **`{tid}`**:")
        md_lines.append(f"     - **Dataset Ground Truth:** `{ex['true_label']}` (raw queue: `{row['queue']}`)")
        md_lines.append(f"     - **Model Predicted Category:** `{ex['predicted_label']}` (Confidence: {ex['confidence']:.2f})")
        md_lines.append(f"     - **Full Ticket Text:** \"{row['text']}\"")
        md_lines.append(f"     - **Top Contributing Features:** {top_words_str}")
        md_lines.append("")

    return "\n".join(md_lines)


def update_readme():
    with open(ARTIFACTS_DIR / "error_analysis.json", "r") as f:
        error_data = json.load(f)

    test_df = pd.read_csv(DATA_DIR / "test.csv")

    examples_md = generate_mislabeled_markdown(error_data, test_df)

    with open(README_PATH, "r") as f:
        readme_text = f.read()

    # Replace the existing point 2 in Known Limitations
    pattern = r"(2\.\s+\*\*Dataset Label (?:Noise|Inconsistencies)[^\n]*\n)(?:(?!\n\s*\d+\.\s+).)*"
    match = re.search(pattern, readme_text, flags=re.DOTALL)
    if match:
        new_readme = readme_text[:match.start()] + examples_md.strip() + "\n" + readme_text[match.end():]
    else:
        raise ValueError("Could not find section 2 in Known Limitations to replace.")

    with open(README_PATH, "w") as f:
        f.write(new_readme)

    print("Updated README.md with generated examples.")

    # Assertion pass: verify every TCK ID in README.md exists in test.csv
    verify_readme_tickets(test_df)


def verify_readme_tickets(test_df: pd.DataFrame):
    with open(README_PATH, "r") as f:
        readme_text = f.read()

    test_by_id = test_df.set_index("ticket_id")
    found_tck_ids = list(set(re.findall(r"TCK-\d+", readme_text)))
    print(f"Found {len(found_tck_ids)} TCK IDs in README.md: {found_tck_ids}")

    for tid in found_tck_ids:
        assert tid in test_by_id.index, f"Assertion Failed: {tid} in README is not in test.csv!"
        raw_text = test_by_id.loc[tid]["text"]
        # If the text is quoted in the README, assert it matches
        assert raw_text in readme_text, f"Assertion Failed: Text for {tid} in test.csv is not in README.md!"

    print("SUCCESS: All TCK IDs in README.md verified against test.csv with identical text!")


if __name__ == "__main__":
    update_readme()
