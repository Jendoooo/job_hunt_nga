import pdfplumber
import json
import re
import sys

def extract_questions_from_pdf(pdf_path, output_path):
    questions = []
    
    print(f"Processing {pdf_path}...")
    
    with pdfplumber.open(pdf_path) as pdf:
        full_text = ""
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                full_text += text + "\n"
    
    # regex pattern to find questions. 
    # This assumes a format like "1. Question text" or "Q1. Question text"
    # followed by Options "A) ... B) ..." or similar.
    # This is a GENERIC pattern and will likely need tuning based on the specific PDF format.
    
    # Example pattern: Look for number followed by dot, then text, then options
    # We will refine this once we see the actual PDF.
    
    # For now, let's try to split by "Question" or numbers if they are distinct
    # This is a placeholder logic
    
    raw_blocks = re.split(r'\n(?=\d+\.|Q\d+)', full_text)
    
    current_id = 1
    
    for block in raw_blocks:
        if not block.strip():
            continue
            
        # Basic parsing attempt
        lines = block.strip().split('\n')
        question_text = lines[0]
        options = []
        
        # Try to find options starting with a), b), c) or A., B., C.
        for line in lines[1:]:
            if re.match(r'^[A-D a-d][\)\.]', line.strip()):
                options.append(line.strip())
        
        if len(options) >= 2:
            questions.append({
                "id": current_id,
                "section": "general", # Default, can be mapped
                "question": question_text,
                "options": options,
                "correctAnswer": 0, # Placeholder
                "explanation": "Extracted from PDF"
            })
            current_id += 1

    print(f"Extracted {len(questions)} potential questions.")
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(questions, f, indent=4)
        
    print(f"Saved to {output_path}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python extract_questions.py <input_pdf> <output_json>")
    else:
        extract_questions_from_pdf(sys.argv[1], sys.argv[2])
