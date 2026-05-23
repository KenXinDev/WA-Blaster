# Design Document

## Overview

This document outlines the design for a WhatsApp Broadcasting Application that enables users to send bulk WhatsApp messages to phone numbers imported from Excel files. The application supports multiple WhatsApp accounts (multi-WhatsApp support) and integrates Google authentication for user login.

The application is built using Next.js and follows a requirements-first approach where business needs drive technical design. The system will be implemented as a web application with a REST API backend and a React-based frontend.

## Architecture

### High-Level Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        WebApp[Next.js Web App]
        AuthUI[Google Auth UI]
        Dashboard[Dashboard UI]
        BroadcastUI[Broadcast UI]
        HistoryUI[History UI]
    end
    
    subgraph "API Layer"
        AuthAPI[Auth API Routes]
        WhatsAppAPI[WhatsApp API Routes]
        ExcelAPI[Excel API Routes]
        MessageAPI[Message API Routes]
        HistoryAPI[History API Routes]
    end
    
    subgraph "Service Layer"
        AuthService[Google Auth Service]
        WhatsAppService[WhatsApp Service]
        ExcelService[Excel Parser Service]
        MessageService[Message Service]
        HistoryService[History Service]
        ConfigService[Config Service]
    end
    
    subgraph "Data Layer"
        DB[(PostgreSQL Database)]
        SessionStore[(Encrypted Session Store)]
        ConfigStore[(config.json)]
    end
    
    subgraph "External Services"
        GoogleOAuth[Google OAuth]
        WhatsAppAPI[WhatsApp Web API]
    end
    
    WebApp --> AuthAPI
    WebApp --> WhatsAppAPI
    WebApp --> ExcelAPI
    WebApp --> MessageAPI
    WebApp --> HistoryAPI
    
    AuthAPI --> AuthService
    WhatsAppAPI --> WhatsAppService
    ExcelAPI --> ExcelService
    MessageAPI --> MessageService
    HistoryAPI --> HistoryService
    
    AuthService --> GoogleOAuth
    WhatsAppService --> WhatsAppAPI
    WhatsAppService --> SessionStore
    MessageService --> DB
    HistoryService --> DB
    ConfigService --> ConfigStore
```

### Next.js Project Structure

```
whatsapp-blast/
├── .kiro/
│   └── specs/whatsapp-blast/
│       ├── requirements.md
│       ├── design.md
│       └── tasks.md
├── .wwebjs_auth/          # WhatsApp session storage
├── public/                # Static assets
├── src/
│   ├── app/               # Next.js App Router
│   │   ├── api/           # API routes
│   │   │   ├── auth/
│   │   │   │   ├── login/route.ts
│   │   │   │   └── callback/route.ts
│   │   │   ├── whatsapp/
│   │   │   │   ├── accounts/route.ts
│   │   │   │   ├── qr-code/route.ts
│   │   │   │   └── connect/route.ts
│   │   │   ├── excel/
│   │   │   │   └── upload/route.ts
│   │   │   ├── messages/
│   │   │   │   └── send/route.ts
│   │   │   └── history/
│   │   │       ├── list/route.ts
│   │   │       └── details/route.ts
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── broadcast/
│   │   │   └── page.tsx
│   │   ├── history/
│   │   │   └── page.tsx
│   │   ├── settings/
│   │   │   └── page.tsx
│   │   ├── layout.tsx
│   │   └── page.tsx       # Login page
│   ├── components/        # React components
│   │   ├── auth/
│   │   │   ├── GoogleAuthButton.tsx
│   │   │   └── AuthGuard.tsx
│   │   ├── whatsapp/
│   │   │   ├── AccountList.tsx
│   │   │   ├── QrCodeDisplay.tsx
│   │   │   └── AccountStatus.tsx
│   │   ├── excel/
│   │   │   ├── FileUpload.tsx
│   │   │   └── ColumnSelector.tsx
│   │   ├── messages/
│   │   │   ├── MessageComposer.tsx
│   │   │   ├── PlaceholderPreview.tsx
│   │   │   └── ProgressTracker.tsx
│   │   ├── history/
│   │   │   ├── HistoryTable.tsx
│   │   │   └── DeliveryDetails.tsx
│   │   └── layout/
│   │       ├── Navbar.tsx
│   │       └── Sidebar.tsx
│   ├── lib/               # Utility functions
│   │   ├── auth/
│   │   │   └── google.ts
│   │   ├── whatsapp/
│   │   │   ├── client.ts
│   │   │   └── session.ts
│   │   ├── excel/
│   │   │   └── parser.ts
│   │   ├── database/
│   │   │   └── db.ts
│   │   ├── config/
│   │   │   └── manager.ts
│   │   └── utils/
│   │       ├── phone.ts
│   │       └── validators.ts
│   ├── types/             # TypeScript type definitions
│   │   ├── auth.ts
│   │   ├── whatsapp.ts
│   │   ├── excel.ts
│   │   ├── messages.ts
│   │   └── history.ts
│   └── middleware.ts
├── config.json            # Application configuration
├── package.json
├── tsconfig.json
├── next.config.js
└── README.md
```

### Data Flow

1. **Authentication Flow**
   - User clicks Google Auth button
   - Redirect to Google OAuth consent screen
   - Google redirects back with authorization code
   - Backend exchanges code for user info
   - Session is created and stored
   - User redirected to dashboard

2. **WhatsApp Account Connection Flow**
   - User clicks "Add Account"
   - QR code is generated and displayed
   - User scans QR code with WhatsApp
   - Backend receives connection event
   - Session is encrypted and stored
   - Account marked as "Active"

3. **Excel Upload Flow**
   - User selects Excel file
   - Frontend sends file to upload endpoint
   - Backend parses Excel file
   - Phone numbers are extracted and validated
   - Invalid numbers are filtered out
   - Results returned to frontend

4. **Message Sending Flow**
   - User composes message with placeholders
   - User selects WhatsApp account
   - User clicks "Send"
   - Message is queued for sending
   - Messages sent with configured delay
   - Progress tracked in real-time
   - Results logged to history

## Components and Interfaces

### Authentication Components

#### GoogleAuthButton
```typescript
interface GoogleAuthButtonProps {
  onSuccess: (user: User) => void;
  onError: (error: string) => void;
}

// Renders Google Sign-In button
// Handles OAuth flow
// Calls callback with user data or error
```

#### AuthGuard
```typescript
interface AuthGuardProps {
  children: React.ReactNode;
  redirectPath?: string;
}

// Protects routes requiring authentication
// Redirects unauthenticated users to login
// Provides user context to children
```

### WhatsApp Components

#### AccountList
```typescript
interface AccountListProps {
  accounts: WhatsAppAccount[];
  onConnect: (accountId: string) => void;
  onDisconnect: (accountId: string) => void;
  onDelete: (accountId: string) => void;
}

// Displays list of WhatsApp accounts
// Shows connection status for each account
// Provides connect/disconnect/delete actions
```

#### QrCodeDisplay
```typescript
interface QrCodeDisplayProps {
  qrData: string;
  onScan: () => void;
}

// Displays QR code for WhatsApp connection
// Shows connection status
// Handles scan completion
```

### Excel Components

#### FileUpload
```typescript
interface FileUploadProps {
  onFileSelect: (file: File) => void;
  onError: (error: string) => void;
  acceptedFormats?: string[];
}

// Handles Excel file upload
// Validates file format
// Triggers file processing
```

#### ColumnSelector
```typescript
interface ColumnSelectorProps {
  columns: string[];
  selectedColumn: string;
  onSelect: (column: string) => void;
}

// Allows user to select phone number column
// Shows available columns from Excel file
```

### Message Components

#### MessageComposer
```typescript
interface MessageComposerProps {
  onSend: (message: string, accountId: string, phoneNumbers: string[]) => void;
  onPreview: (message: string, sampleData: Record<string, string>) => void;
  availablePlaceholders: string[];
}

// Message composition interface
// Supports placeholder variables
// Provides preview functionality
```

#### PlaceholderPreview
```typescript
interface PlaceholderPreviewProps {
  message: string;
  sampleData: Record<string, string>;
}

// Shows how message will appear with placeholders replaced
// Uses sample data for preview
```

#### ProgressTracker
```typescript
interface ProgressTrackerProps {
  total: number;
  sent: number;
  failed: number;
  onProgress: (current: number, total: number) => void;
}

// Displays sending progress
// Shows success/failure counts
// Updates in real-time
```

### History Components

#### HistoryTable
```typescript
interface HistoryTableProps {
  history: MessageHistory[];
  onViewDetails: (historyId: string) => void;
  onExport: () => void;
}

// Displays message history
// Shows date, message preview, recipient count, status
// Provides export functionality
```

#### DeliveryDetails
```typescript
interface DeliveryDetailsProps {
  historyId: string;
  results: DeliveryResult[];
}

// Shows detailed delivery results
// Lists success/failure per number
// Provides error details
```

## Data Models

### User
```typescript
interface User {
  id: string;              // Unique user ID from Google
  email: string;           // User's email address
  name: string;            // User's display name
  picture: string;         // User's profile picture URL
  createdAt: Date;         // Account creation timestamp
  lastLogin: Date;         // Last login timestamp
}
```

### WhatsAppAccount
```typescript
interface WhatsAppAccount {
  id: string;              // Unique account ID
  userId: string;          // Owner user ID
  phoneNumber: string;     // WhatsApp phone number
  sessionData: string;     // Encrypted session data
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
  lastConnected: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
```

### ExcelFile
```typescript
interface ExcelFile {
  id: string;              // Unique file ID
  userId: string;          // Owner user ID
  fileName: string;        // Original file name
  filePath: string;        // Stored file path
  parsedAt: Date;          // When file was parsed
  totalRows: number;       // Total rows in file
  validNumbers: number;    // Valid phone numbers count
  invalidNumbers: number;  // Invalid phone numbers count
  columns: string[];       // Column names from file
  phoneNumberColumn: string; // Selected phone number column
}
```

### MessageTemplate
```typescript
interface MessageTemplate {
  id: string;              // Unique template ID
  userId: string;          // Owner user ID
  name: string;            // Template name
  content: string;         // Message content with placeholders
  placeholders: string[];  // Extracted placeholder names
  createdAt: Date;
  updatedAt: Date;
}
```

### MessageHistory
```typescript
interface MessageHistory {
  id: string;              // Unique history ID
  userId: string;          // Owner user ID
  accountId: string;       // WhatsApp account used
  excelFileId: string;     // Source Excel file
  templateId: string | null; // Used template (if any)
  messageContent: string;  // Message content sent
  recipientCount: number;  // Total recipients
  sentCount: number;       // Successfully sent
  failedCount: number;     // Failed sends
  skippedCount: number;    // Skipped (invalid)
  status: 'pending' | 'sending' | 'completed' | 'failed';
  delaySeconds: number;    // Configured delay
  startedAt: Date;
  completedAt: Date | null;
}
```

### DeliveryResult
```typescript
interface DeliveryResult {
  id: string;              // Unique result ID
  historyId: string;       // Parent history record
  phoneNumber: string;     // Recipient phone number
  status: 'success' | 'failed' | 'skipped';
  errorMessage: string | null; // Error message if failed
  sentAt: Date | null;     // When message was sent
  retryCount: number;      // Number of retry attempts
}
```

### Config
```typescript
interface Config {
  rateLimitDelay: number;  // Default delay between messages (seconds)
  maxRetries: number;      // Maximum retry attempts
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  sessionEncryptionKey: string; // Encryption key for sessions
  maxAccountsPerUser: number;   // Maximum WhatsApp accounts per user
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Authentication session creation

*For any* valid Google OAuth authorization code, the authentication system SHALL create a user session and grant access to the dashboard

**Validates: Requirements 1.3**

### Property 2: Session persistence across requests

*For any* authenticated user session, subsequent API requests with valid session tokens SHALL maintain the user's authenticated state

**Validates: Requirements 1.4, 9.1**

### Property 3: WhatsApp account session encryption

*For any* WhatsApp account session data, the system SHALL store it encrypted and only decrypt it when establishing a WhatsApp connection

**Validates: Requirements 9.2, 10.1**

### Property 4: Excel parsing round-trip validation

*For any* valid Excel file with phone numbers, parsing the file and then re-serializing the extracted data SHALL produce equivalent results

**Validates: Requirements 3.2, 11.4**

### Property 5: Phone number validation consistency

*For any* phone number string, the validation system SHALL consistently identify valid WhatsApp numbers and filter out invalid ones

**Validates: Requirements 3.4**

### Property 6: Placeholder replacement correctness

*For any* message template with placeholders and corresponding Excel data, replacing placeholders with cell values SHALL produce the expected personalized message

**Validates: Requirements 5.2**

### Property 7: Message sending idempotence

*For any* message sending operation, retrying a failed send up to the configured maximum retries SHALL not result in duplicate messages being sent to the same recipient

**Validates: Requirements 4.7, 3.7**

### Property 8: History persistence round-trip

*For any* message history record, storing it in the database and then retrieving it SHALL produce an equivalent record

**Validates: Requirements 6.1, 9.3, 11.4**

### Property 9: Rate limiting delay enforcement

*For any* configured delay setting, the message sending system SHALL wait at least the configured number of seconds between each message send

**Validates: Requirements 7.2**

### Property 10: Access control for user data

*For any* user's data (accounts, messages, history), the system SHALL only allow access to that user's data based on their authentication token

**Validates: Requirements 10.3**

### Property 11: Configuration round-trip consistency

*For any* valid configuration object, parsing then serializing then parsing SHALL produce an equivalent configuration

**Validates: Requirements 11.4**

## Error Handling

### Authentication Errors

| Error Code | Description | Handling |
|------------|-------------|----------|
| AUTH_001 | Invalid OAuth code | Redirect to login with error message |
| AUTH_002 | Session expired | Clear session and redirect to login |
| AUTH_003 | Google API unavailable | Display error message with retry option |

### WhatsApp Account Errors

| Error Code | Description | Handling |
|------------|-------------|----------|
| WA_001 | QR code expired | Generate new QR code |
| WA_002 | Connection failed | Mark account as "error" with error details |
| WA_003 | Session corrupted | Clear session and require reconnection |
| WA_004 | WhatsApp Web API unavailable | Retry with exponential backoff |

### Excel Processing Errors

| Error Code | Description | Handling |
|------------|-------------|----------|
| EXCEL_001 | Invalid file format | Display error with supported formats |
| EXCEL_002 | Empty file | Notify user file has no data |
| EXCEL_003 | No valid phone numbers | Show count of invalid numbers |
| EXCEL_004 | File read error | Display descriptive error message |

### Message Sending Errors

| Error Code | Description | Handling |
|------------|-------------|----------|
| MSG_001 | Invalid phone number | Skip and log error |
| MSG_002 | WhatsApp account disconnected | Pause sending and notify user |
| MSG_003 | Rate limit exceeded | Increase delay and retry |
| MSG_004 | Message too long | Truncate or split message |

### General Errors

| Error Code | Description | Handling |
|------------|-------------|----------|
| ERR_001 | Database connection failed | Retry connection with backoff |
| ERR_002 | Configuration invalid | Log error and use defaults |
| ERR_003 | Unexpected error | Log full stack trace, show generic message |

### Error Handling Strategy

1. **Graceful Degradation**: When possible, continue operation with reduced functionality
2. **User Notification**: Display clear, actionable error messages
3. **Logging**: Log all errors with context for debugging
4. **Retry Logic**: Implement exponential backoff for transient failures
5. **Recovery**: Provide clear paths for users to recover from errors

## Testing Strategy

### Dual Testing Approach

This project uses a dual testing approach combining unit tests and property-based tests for comprehensive coverage.

### Unit Testing

Unit tests verify specific examples, edge cases, and error conditions. They focus on:

- **Specific examples** that demonstrate correct behavior
- **Integration points** between components
- **Edge cases** and error conditions
- **UI rendering** and user interactions

Unit tests should be written for:
- Component rendering with various props
- API route handlers with different inputs
- Utility functions with specific inputs
- Error scenarios and edge cases

### Property-Based Testing

Property-based tests verify universal properties across all inputs. They focus on:

- **Universal properties** that hold for all valid inputs
- **Comprehensive input coverage** through randomization
- **Round-trip validations** for serialization/deserialization
- **Invariant checks** for data transformations

Property-based tests should be written for:
- Excel parsing and phone number validation
- Placeholder replacement logic
- Configuration serialization/deserialization
- Session encryption/decryption
- Message history persistence

### Property-Based Testing Configuration

- **Library**: fast-check (TypeScript/JavaScript)
- **Minimum iterations**: 100 per property test
- **Test tags**: **Feature: whatsapp-blast, Property {number}: {property_text}**

### Test Coverage Requirements

| Requirement | Test Type | Coverage |
|-------------|-----------|----------|
| Authentication flow | Unit + Property | All OAuth scenarios |
| WhatsApp connection | Unit + Integration | QR code, connection states |
| Excel parsing | Property | Various file formats, edge cases |
| Message sending | Unit + Property | Success, failure, retry scenarios |
| History tracking | Property | Persistence, retrieval, export |
| Rate limiting | Property | Delay enforcement, validation |
| Error handling | Unit | All error scenarios |
| Configuration | Property | Round-trip, validation |

### Test Organization

```
src/
├── __tests__/
│   ├── unit/              # Unit tests
│   │   ├── components/
│   │   ├── api/
│   │   └── utils/
│   ├── properties/        # Property-based tests
│   │   ├── excel.test.ts
│   │   ├── config.test.ts
│   │   ├── session.test.ts
│   │   └── history.test.ts
│   └── integration/       # Integration tests
│       ├── auth.test.ts
│       ├── whatsapp.test.ts
│       └── e2e.test.ts
```

### Property-Based Test Examples

```typescript
// Example: Excel parsing property test
import * as fc from 'fast-check';
import { parseExcelFile } from '@/lib/excel/parser';

describe('Excel parsing properties', () => {
  it('Property 4: Parsing round-trip validation', () => {
    fc.assert(
      fc.property(fc.string(), fc.array(fc.string()), (fileName, phoneNumbers) => {
        // Generate test Excel file
        const excelData = createTestExcel(fileName, phoneNumbers);
        
        // Parse and re-serialize
        const parsed = parseExcelFile(excelData);
        const reSerialized = serializeParsedData(parsed);
        
        // Verify round-trip produces equivalent results
        expect(reSerialized).toEqual(excelData);
      }),
      { numRuns: 100 }
    );
  });
});
```

## Technology Stack

### Frontend

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **State Management**: React Context + useReducer
- **HTTP Client**: fetch API (built-in)
- **Form Handling**: React Hook Form
- **Date Handling**: date-fns

### Backend

- **Runtime**: Node.js 20+
- **Framework**: Next.js API Routes
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Session Management**: NextAuth.js (custom implementation)
- **File Storage**: Local file system (encrypted)

### WhatsApp Integration

- **Library**: whatsapp-web.js
- **Browser**: Puppeteer (headless Chrome)
- **Session Storage**: Encrypted local storage

### Excel Processing

- **Library**: exceljs
- **Validation**: phone-number-validation

### Security

- **Encryption**: AES-256-GCM for session data
- **Authentication**: Google OAuth 2.0
- **HTTPS**: Required for all communications

### Development

- **Language**: TypeScript
- **Build Tool**: Next.js
- **Testing**: Jest + fast-check
- **Linting**: ESLint + Prettier

## Security Considerations

### Authentication Security

- Google OAuth 2.0 with PKCE for enhanced security
- Short-lived session tokens (1 hour)
- Refresh tokens for session renewal
- Secure session storage (HttpOnly cookies)

### Data Security

- AES-256-GCM encryption for WhatsApp session tokens
- Environment variables for sensitive configuration
- Input validation on all API endpoints
- SQL injection prevention via Prisma ORM

### Privacy Considerations

- Phone numbers stored encrypted
- No third-party data sharing
- GDPR-compliant data deletion
- User consent for data processing

### Rate Limiting

- Configurable delay between messages
- Warning system for potential rate limits
- Automatic retry with backoff

## Deployment Considerations

### Environment Variables

```env
# Google OAuth
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/whatsapp_blast

# Encryption
SESSION_ENCRYPTION_KEY=your_32_byte_encryption_key

# WhatsApp
PUPPETEER_EXECUTABLE_PATH=/path/to/chrome
```

### Production Requirements

- HTTPS enabled
- Environment variables configured
- Database migrations applied
- Session encryption key generated
- WhatsApp browser configured

## Next Steps

1. **Setup**: Initialize Next.js project with TypeScript
2. **Database**: Set up PostgreSQL and Prisma schema
3. **Authentication**: Implement Google OAuth flow
4. **WhatsApp**: Integrate whatsapp-web.js
5. **Excel Processing**: Implement file upload and parsing
6. **Message Sending**: Build message composition and sending
7. **History**: Implement message tracking and history
8. **Testing**: Write unit and property-based tests
9. **Documentation**: Add API documentation and user guide
