# **App Name**: LINE Expense Bot

## Core Features:

- LINE Webhook Endpoint: Establish a Next.js API route as a webhook endpoint to receive and process messages from the LINE messaging platform.
- Expense Data Ingestion: Parse incoming LINE messages to extract expense details (e.g., 'Cafe 15.50' or 'Dinner with friends $75') and save them to Firestore.
- Firestore Integration: Securely connect and store user expense data (amount, description, date, category, user ID) in Firebase Firestore.
- AI Expense Categorization Tool: Utilize a generative AI tool to automatically suggest or assign expense categories (e.g., 'Food', 'Transport') based on user input, or allow manual categorization.
- Expense Listing & Summary: Enable users to request a list of their recent expenses or a summary by category/timeframe via LINE messages, retrieved from Firestore.
- Basic User Identification: Associate expenses with unique LINE user IDs to ensure personal data is stored and retrieved correctly for each user.

## Style Guidelines:

- Color scheme: Light mode. Primary: A professional, balanced green (#47A329), reflecting efficiency and growth. Background: A very pale, soothing green (#F1F5F0) for clarity and readability. Accent: A vibrant yellow-green (#B4DD3C) for calls to action and highlights, providing an energetic contrast.
- Font: 'Inter' (sans-serif), chosen for its modern, objective, and highly readable characteristics, ideal for financial data and clear communication within the chat interface.
- Use clear, minimalistic icons within any web-based interfaces or Rich Menus in LINE, representing financial transactions, categories, and summaries effectively.
- Prioritize a chat-driven interface with structured responses and interactive elements within LINE (like quick replies or rich menus), supplemented by a clean, mobile-first layout for any simple web-based configuration or summary pages.
- Incorporate subtle, quick animations or visual cues within the LINE chat or web interface to confirm successful expense recording or data retrieval, enhancing user experience.