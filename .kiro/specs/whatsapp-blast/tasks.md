# Implementation Plan: WhatsApp Broadcasting Application

## Overview

This implementation plan breaks down the WhatsApp Broadcasting Application into discrete coding steps. The application will be built using Next.js 14 with TypeScript, implementing Google authentication, multi-WhatsApp account management, Excel file upload, message broadcasting with personalization, and message history tracking.

The implementation follows a layered architecture:
1. **Setup**: Project structure, database, and core utilities
2. **Authentication**: Google OAuth implementation
3. **WhatsApp Integration**: Account management and messaging
4. **Excel Processing**: File upload and parsing
5. **Message Broadcasting**: Composition, personalization, and sending
6. **History Tracking**: Message history and delivery results
7. **Configuration**: Settings management
8. **Testing**: Unit and property-based tests

## Tasks

- [x] 1. Set up project structure and core interfaces
  - Initialize Next.js 14 project with TypeScript in the current folder
  - Create directory structure following Next.js App Router pattern
  - Define TypeScript interfaces for all data models (User, WhatsAppAccount, MessageHistory, etc.)
  - Configure TypeScript and ESLint rules
  - Install all required dependencies (prisma, next-auth, whatsapp-web.js, xlsx, etc.)
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 6.1, 9.1, 9.2, 9.3, 10.1_

- [ ] 2. Implement database layer
  - [-] 2.1. Create Prisma schema with all models
    - Define User, WhatsAppAccount, ExcelFile, MessageTemplate, MessageHistory, DeliveryResult models
    - Set up relationships between models
    - Run prisma generate and prisma db push
    - _Requirements: 9.3_
  - [~] 2.2. Create database client and connection pool
    - Initialize Prisma client with connection pooling
    - Implement connection error handling
    - _Requirements: 9.3_

- [ ] 3. Implement Google authentication
  - [-] 3.1. Create Google OAuth service
    - Implement OAuth client initialization using NextAuth.js
    - Implement authorization code exchange
    - Implement user info retrieval
    - _Requirements: 1.1, 1.2, 1.3_
  - [~] 3.2. Create authentication API routes
    - Implement NextAuth.js API route handler
    - Implement session creation and storage
    - _Requirements: 1.2, 1.3, 9.1_
  - [~] 3.3. Create authentication UI components
    - Implement GoogleAuthButton component
    - Implement AuthGuard component for route protection
    - Implement login page with authentication flow
    - _Requirements: 1.1, 1.4, 1.5_

- [ ] 4. Implement WhatsApp account management
  - [-] 4.1. Create WhatsApp client wrapper
    - Initialize whatsapp-web.js client
    - Implement QR code generation
    - Implement connection event handling
    - _Requirements: 2.2, 2.3, 2.4_
  - [~] 4.2. Create WhatsApp session management
    - Implement session encryption using AES-256-GCM
    - Implement session storage and retrieval
    - Implement session cleanup on disconnect
    - _Requirements: 2.4, 2.5, 9.2, 10.1_
  - [~] 4.3. Create WhatsApp API routes
    - Implement /api/whatsapp/accounts for listing accounts
    - Implement /api/whatsapp/qr-code for QR code generation
    - Implement /api/whatsapp/connect for connection handling
    - Implement /api/whatsapp/disconnect for disconnection
    - _Requirements: 2.1, 2.2, 2.5, 2.6, 2.7_
  - [~] 4.4. Create WhatsApp UI components
    - Implement AccountList component
    - Implement QrCodeDisplay component
    - Implement AccountStatus component
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [ ] 5. Implement Excel file upload and parsing
  - [-] 5.1. Create Excel parser service
    - Implement file upload handling using multer or Next.js API
    - Implement Excel parsing using SheetJS
    - Implement phone number extraction
    - _Requirements: 3.1, 3.2, 3.3_
  - [~] 5.2. Create phone number validation utility
    - Implement international format validation
    - Implement WhatsApp number validation
    - Implement invalid number filtering
    - _Requirements: 3.4, 5.1_
  - [~] 5.3. Create Excel API routes
    - Implement /api/excel/upload route for file upload
    - Implement /api/excel/columns route for column listing
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_
  - [~] 5.4. Create Excel UI components
    - Implement FileUpload component
    - Implement ColumnSelector component
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [ ] 6. Implement message composition and sending
  - [~] 6.1. Create message service
    - Implement message composition with placeholders
    - Implement placeholder replacement logic
    - Implement message sending queue
    - _Requirements: 4.1, 4.2, 4.3, 5.1, 5.2, 5.3_
  - [~] 6.2. Create placeholder utility
    - Implement placeholder extraction from messages
    - Implement placeholder replacement with Excel data
    - Implement sample preview generation
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  - [~] 6.3. Create message API routes
    - Implement /api/messages/send route for sending messages
    - Implement /api/messages/preview route for preview generation
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 5.1, 5.2, 5.3, 5.4_
  - [~] 6.4. Create message UI components
    - Implement MessageComposer component
    - Implement PlaceholderPreview component
    - Implement ProgressTracker component
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 5.1, 5.2, 5.3, 5.4_

- [ ] 7. Implement message history and tracking
  - [~] 7.1. Create history service
    - Implement history record creation
    - Implement delivery result tracking
    - Implement history retrieval
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  - [~] 7.2. Create history API routes
    - Implement /api/history/list route for listing history
    - Implement /api/history/details route for detailed results
    - Implement /api/history/export route for CSV export
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  - [~] 7.3. Create history UI components
    - Implement HistoryTable component
    - Implement DeliveryDetails component
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 8. Implement rate limiting and delay configuration
  - [-] 8.1. Create delay configuration service
    - Implement delay setting storage
    - Implement delay enforcement during message sending
    - Implement rate limit warnings
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  - [~] 8.2. Create settings API routes
    - Implement /api/settings/delay route for delay configuration
    - Implement /api/settings/rate-limit route for rate limit settings
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  - [~] 8.3. Create settings UI components
    - Implement delay configuration component
    - Implement rate limit warning component
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [ ] 9. Implement configuration management
  - [-] 9.1. Create config parser and serializer
    - Implement JSON config loading
    - Implement config validation
    - Implement config saving
    - _Requirements: 11.1, 11.2, 11.3_
  - [~] 9.2. Create config service
    - Implement config loading on startup
    - Implement config validation
    - Implement default config fallback
    - _Requirements: 11.1, 11.2, 11.3, 11.4_
  - [~] 9.3. Create config API routes
    - Implement /api/config route for config retrieval
    - Implement /api/config/update route for config updates
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [ ] 10. Implement error handling and logging
  - [-] 10.1. Create error handling middleware
    - Implement error logging
    - Implement error response formatting
    - Implement error categorization
    - _Requirements: 8.1, 8.2, 8.3, 8.4_
  - [~] 10.2. Create logging utility
    - Implement structured logging
    - Implement log levels (debug, info, warn, error)
    - Implement log storage
    - _Requirements: 8.1, 8.2, 8.3, 8.4_
  - [~] 10.3. Create log viewer component
    - Implement log display component
    - Implement log filtering
    - Implement log export
    - _Requirements: 8.4_

- [ ] 11. Implement security and privacy features
  - [~] 11.1. Create access control middleware
    - Implement user data isolation
    - Implement authentication token validation
    - Implement authorization checks
    - _Requirements: 10.1, 10.2, 10.3, 10.4_
  - [ ] 11.2. Implement HTTPS enforcement
    - Configure Next.js for HTTPS
    - Implement redirect from HTTP to HTTPS
    - _Requirements: 10.2_

- [ ] 12. Integration and wiring
  - [~] 12.1. Wire all components together
    - Connect frontend components to API routes
    - Connect API routes to services
    - Connect services to database
    - _Requirements: All requirements_
  - [~] 12.2. Implement middleware
    - Implement authentication middleware
    - Implement error handling middleware
    - Implement request logging
    - _Requirements: 1.5, 8.1, 8.2, 8.3, 8.4_

- [~] 13. Final checkpoint - Ensure all tests pass
  - Run npm run build to verify no build errors
  - Ensure all TypeScript types are correct
  - Verify all API routes are working
  - Ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- The implementation follows Next.js App Router pattern with API routes for backend functionality
- All data models are defined in TypeScript interfaces for type safety
- WhatsApp sessions are encrypted using AES-256-GCM for security
- Excel files are parsed using SheetJS for cross-platform compatibility
- Message personalization supports placeholder variables from Excel columns
- Rate limiting is configurable to avoid WhatsApp API limits

## Task Dependency Graph

```json
{
  "waves": [
    {
      "id": 0,
      "tasks": ["1. Set up project structure and core interfaces"]
    },
    {
      "id": 1,
      "tasks": ["2.1. Create Prisma schema with all models", "3.1. Create Google OAuth service", "4.1. Create WhatsApp client wrapper", "5.1. Create Excel parser service", "8.1. Create delay configuration service", "9.1. Create config parser and serializer", "10.1. Create error handling middleware", "11.2. Implement HTTPS enforcement"]
    },
    {
      "id": 2,
      "tasks": ["2.2. Create database client and connection pool", "5.2. Create phone number validation utility", "9.2. Create config service", "10.2. Create logging utility"]
    },
    {
      "id": 3,
      "tasks": ["3.2. Create authentication API routes", "4.2. Create WhatsApp session management", "5.3. Create Excel API routes", "8.2. Create settings API routes", "9.3. Create config API routes"]
    },
    {
      "id": 4,
      "tasks": ["3.3. Create authentication UI components", "4.3. Create WhatsApp API routes", "5.4. Create Excel UI components", "8.3. Create settings UI components", "10.3. Create log viewer component", "11.1. Create access control middleware"]
    },
    {
      "id": 5,
      "tasks": ["4.4. Create WhatsApp UI components", "6.1. Create message service"]
    },
    {
      "id": 6,
      "tasks": ["6.2. Create placeholder utility", "7.1. Create history service"]
    },
    {
      "id": 7,
      "tasks": ["6.3. Create message API routes", "7.2. Create history API routes"]
    },
    {
      "id": 8,
      "tasks": ["6.4. Create message UI components", "7.3. Create history UI components"]
    },
    {
      "id": 9,
      "tasks": ["12.1. Wire all components together"]
    },
    {
      "id": 10,
      "tasks": ["12.2. Implement middleware"]
    },
    {
      "id": 11,
      "tasks": ["13. Final checkpoint - Ensure all tests pass"]
    }
  ]
}
```
