export default {
  common: {
    notifications: 'Notifications',
  },
  admin: {
    // Navigation labels
    nav: {
      dashboard: 'Dashboard',
      clinicManagement: 'Clinic Management',
      clinicDirectory: 'Clinic Directory',
      clinicVerification: 'Clinic Verification',
      ownerAccounts: 'Owner Accounts',

      dentistManagement: 'Dentist Management',
      dentistDirectory: 'Dentist Directory',
      verificationQueue: 'Verification Queue',
      professionalNetwork: 'Professional Network',

      revenueBilling: 'Revenue & Billing',
      revenueDashboard: 'Revenue Dashboard',
      paymentProcessing: 'Payment Processing',
      subscriptionManagement: 'Subscription Management',

      aiPlatform: 'AI Platform',
      aiUsageAnalytics: 'AI Usage Analytics',
      modelManagement: 'Model Management',
      aiBilling: 'AI Billing',

      supportHelpdesk: 'Support & Helpdesk',
      ticketManagement: 'Ticket Management',
      knowledgeBase: 'Knowledge Base',
      communicationCenter: 'Communication Center',

      analytics: 'Analytics & Reports',
      businessIntelligence: 'Business Intelligence',
      performanceMetrics: 'Performance Metrics',
      financialReports: 'Financial Reports',

      systemAdministration: 'System Administration',
      userManagement: 'User Management',
      systemConfiguration: 'System Configuration',
      monitoring: 'Monitoring & Alerts',

      complianceSecurity: 'Compliance & Security',
      dataPrivacy: 'Data Privacy',
      securityCenter: 'Security Center',
      regulatoryCompliance: 'Regulatory Compliance',

      partnerships: 'Partnerships',
      partnerDirectory: 'Partner Directory',
      apiManagement: 'API Management',
      integrations: 'Integrations',

      contentManagement: 'Content Management',
      marketingContent: 'Marketing Content',
      educationalResources: 'Educational Resources',
      resourceLibrary: 'Resource Library'
    },

    // User interface
    ui: {
      search: 'Search admin...',
      darkMode: 'Dark Mode',
      lightMode: 'Light Mode',
      logout: 'Logout',
      profile: 'Profile'
    },

    // Sidebar interface
    sidebar: {
      searchPlaceholder: 'Search admin...',
      profile: 'Profile Settings',
      preferences: 'Preferences',
      logout: 'Sign Out'
    },
    pages: {
      dashboard: {
        title: 'Admin Dashboard',
        subtitle: 'Executive Summary & Platform Overview'
      },
      clinics: {
        title: 'Clinic Management',
        subtitle: 'Clinic Directory, Verification & Onboarding'
      },
      dentists: {
        title: 'Dentist Verification',
        subtitle: 'Professional Network & Credential Verification'
      },
      revenue: {
        title: 'Revenue & Billing',
        subtitle: 'Payment Processing & Financial Analytics'
      },
      aiPlatform: {
        title: 'AI Platform',
        subtitle: 'AI Usage Monitoring & Model Management'
      },
      support: {
        title: 'Support & Helpdesk',
        subtitle: 'Customer Support & Success Management'
      },
      analytics: {
        title: 'Analytics & Reports',
        subtitle: 'Business Intelligence & Data Insights'
      },
      system: {
        title: 'System Administration',
        subtitle: 'User Management & Platform Configuration'
      },
      compliance: {
        title: 'Compliance & Security',
        subtitle: 'Data Privacy & Regulatory Compliance'
      },
      partnerships: {
        title: 'Partnerships & API',
        subtitle: 'Integration Partners & API Management'
      },
      content: {
        title: 'Content Management',
        subtitle: 'Marketing & Educational Resources'
      },
      profile: {
        title: 'Profile Settings',
        subtitle: 'Manage your admin account settings'
      },
      preferences: {
        title: 'Preferences',
        subtitle: 'Customize your admin experience'
      }
    },
    clinicManagement: {
      header: {
        badge: 'Clinic Management',
        title: 'Clinic Management',
        subtitle: 'Manage clinic registrations, verification, and owner accounts',
        totalLabel: 'Total Clinics',
        actions: {
          reviewPending: 'Review Pending Clinics'
        },
        statusTabs: {
          all: 'All Clinics',
          pending: 'Pending',
          verified: 'Verified',
          rejected: 'Rejected'
        },
        cards: {
          total: {
            title: 'Total',
            description: 'Registered clinics'
          },
          pending: {
            title: 'Pending',
            description: 'Awaiting review'
          },
          verified: {
            title: 'Verified',
            description: 'Approved clinics'
          },
          rejected: {
            title: 'Rejected',
            description: 'Declined applications'
          }
        }
      },
      directory: {
        title: 'Clinic Directory',
        description: 'Track onboarding status, documents, and ownership details.',
        loading: 'Loading...',
        actions: {
          refresh: 'Refresh',
          refreshing: 'Refreshing...',
          addClinic: 'Add Clinic'
        },
        search: {
          placeholder: 'Search by clinic, owner, or email'
        },
        status: {
          all: 'All',
          pending: 'Pending',
          verified: 'Verified',
          rejected: 'Rejected'
        },
        filters: {
          clear: 'Clear filters'
        },
        list: {
          emptyTitle: 'No clinics found',
          emptyDescription: 'Try adjusting the search term or filters. New clinic registrations will appear here automatically after submission.'
        },
        errors: {
          sessionExpired: 'Session expired. Redirecting to login...',
          fetchFailed: 'Failed to fetch clinics'
        },
        pagination: {
          none: 'No clinics to display',
          range: 'Showing {{start}}-{{end}} of {{total}}',
          pageInfo: 'Page {{page}} of {{totalPages}}',
          prev: 'Prev',
          next: 'Next'
        }
      },
      create: {
        title: 'Create Clinic',
        defaults: {
          branchName: 'Main'
        },
        errors: {
          requiredFields: 'Please fill required fields: {{fields}}',
          requiredFiles: 'Please attach required files: {{files}}',
          createFailed: 'Failed to create clinic',
          unexpected: 'Unexpected error'
        },
        success: {
          message: 'Clinic created successfully',
          title: 'Clinic Created Successfully',
          subtitle: 'The clinic profile has been created and registered in the system.',
          tempPassword: {
            title: 'Temporary Owner Password',
            subtitle: 'Share this password securely with the clinic owner',
            copyTooltip: 'Copy password',
            warning: '⚠️ The owner should change this password after their first login for security.'
          },
          actions: {
            backToDirectory: 'Back to Clinic Directory'
          }
        },
        form: {
          fields: {
            legalName: {
              label: 'Legal Name',
              placeholder: 'Enter legal entity name'
            },
            brandName: {
              label: 'Brand Name',
              placeholder: 'Enter brand or clinic name'
            },
            facilityType: {
              label: 'Facility Type',
              placeholder: 'Select facility type...',
              options: {
                klinikGigi: 'Dental Clinic',
                rsgm: 'Dental Teaching Hospital (RSGM)'
              },
              hint: 'Choose the closest matching facility type. This controls onboarding flow.'
            },
            city: {
              label: 'City',
              placeholder: 'e.g. West Jakarta'
            },
            province: {
              label: 'Province',
              placeholder: 'e.g. DKI Jakarta'
            },
            postalCode: {
              label: 'Postal Code',
              placeholder: 'e.g. 12321'
            },
            phone: {
              label: 'Clinic Phone',
              placeholder: 'e.g. 0812-1234-5678'
            },
            email: {
              label: 'Clinic Email',
              placeholder: 'e.g. clinic@example.com'
            },
            streetAddress: {
              label: 'Street Address',
              placeholder: 'Enter full street address'
            },
            ownerName: {
              label: 'Owner Name',
              placeholder: 'Owner full name'
            },
            ownerEmail: {
              label: 'Owner Email',
              placeholder: 'owner@example.com'
            },
            ownerPosition: {
              label: 'Owner Position',
              options: {
                owner: 'Owner',
                manager: 'Manager'
              }
            },
            ownerWhatsapp: {
              label: 'Owner WhatsApp',
              placeholder: 'e.g. +628123456789'
            },
            ownerNik: {
              label: 'Owner NIK',
              placeholder: 'Enter owner national ID number'
            },
            nibNumber: {
              label: 'NIB Number',
              placeholder: 'Enter NIB number'
            },
            npwpNumber: {
              label: 'NPWP Number',
              placeholder: 'Enter NPWP number'
            },
            ktpFile: {
              label: 'KTP File (jpeg/png/pdf)'
            },
            ktpSelfie: {
              label: 'KTP Selfie / Owner Photo (jpeg/png/pdf)',
              hint: 'Optional: Photo of owner holding their KTP for verification'
            },
            nibFile: {
              label: 'NIB File (jpeg/png/pdf)'
            },
            npwpFile: {
              label: 'NPWP File (jpeg/png/pdf)'
            },
            operationalLicense: {
              label: 'Operational License'
            },
            additionalLicenses: {
              label: 'Additional Licenses (Optional)',
              hint: 'Upload any additional permits or certificates (max 5 files)'
            },
            dataProtectionContact: {
              label: 'Data Protection Contact Email',
              placeholder: 'dpo@clinic.com',
              hint: 'Optional: Email for data protection/privacy inquiries'
            }
          },
          files: {
            ktp: 'KTP File',
            ktpSelfie: 'KTP Selfie / Owner Photo',
            nib: 'NIB File',
            npwp: 'NPWP File',
            operationalLicense: 'Operational License',
            additionalLicenses: 'Additional Licenses'
          },
          operatingHours: {
            title: 'Operating Hours',
            weekdayLabel: 'Monday - Friday',
            weekdayPlaceholder: '08:00-17:00',
            saturdayLabel: 'Saturday',
            saturdayPlaceholder: '08:00-14:00 or closed',
            sundayLabel: 'Sunday',
            sundayPlaceholder: 'closed or 09:00-12:00',
            hint: 'Default hours will be used for the main branch. You can customize per branch later.'
          },
          actions: {
            submit: 'Create Clinic',
            creating: 'Creating...',
            cancel: 'Cancel'
          },
          agreement: {
            prefix: 'I confirm this clinic accepts the',
            terms: 'Terms & Conditions',
            connector: 'and',
            privacy: 'Privacy Policy',
            suffix: '. (Simple confirmation similar to marketplace flows)'
          }
        }
      }
    },
    clinicDetail: {
      backButton: 'Back',
      statusLabels: {
        pending: 'Pending Verification',
        verified: 'Verified',
        rejected: 'Rejected',
        unknown: 'Unknown Status'
      },
      verification: {
        approveButton: 'Approve Clinic',
        rejectButton: 'Reject Application',
        verifiedBadge: 'Verified',
        rejectedBadge: 'Rejected',
        verificationDate: 'Verified on {{date}}',
        modal: {
          approveTitle: 'Approve Clinic Registration',
          approveDescription: 'This clinic will be marked as verified and granted full access to the platform.',
          rejectTitle: 'Reject Clinic Application',
          rejectDescription: 'This clinic registration will be rejected and the owner will be notified.',
          notesLabel: 'Verification Notes',
          notesPlaceholderApprove: 'Add any notes about the verification (optional)',
          notesPlaceholderReject: 'Explain why this application is being rejected (required)',
          notesRequired: '⚠️ Rejection notes are required to help the applicant understand the decision.',
          cancelButton: 'Cancel',
          confirmApproveButton: 'Approve Clinic',
          confirmRejectButton: 'Reject Application',
          verifying: 'Processing...'
        }
      },
      errors: {
        notFoundRedirect: 'Clinic not found. Redirecting to directory…',
        fetchFailed: 'Failed to fetch clinic detail',
        staffFetchFailed: 'Failed to fetch clinic team data',
        verifyFailed: 'Failed to update verification status'
      },
      unnamedClinic: 'Unnamed Clinic',
      defaultTimezone: 'Asia/Jakarta',
      unassignedBranchLabel: 'Unassigned Staff',
      unnamedBranchLabel: 'Unnamed Branch',
      virtualBadge: 'Virtual',
      mainBadge: 'Main',
      branchDirectoryTitle: 'Branch Directory',
      branchCount: '{{count}} registered branches',
      noBranches: 'No branches registered yet.',
      noBranchesEmpty: 'No branches registered yet. Add a branch to manage operational coverage and staffing.',
      unassignedStaffHint: 'Staff without explicit branch assignment',
      staffRosterTitle: 'Staff Roster',
      staffRosterSubtitle: 'Showing staff assigned to {{branch}}.',
      noMainBranchHint: 'No main branch detected. Assign a primary branch to surface staff.',
      staffCountLabel: '{{count}} staff',
      roomCountLabel: '{{count}} rooms',
      branchCodeLabel: 'Code: {{code}}',
      quickActionsTitle: 'Quick Actions',
      quickActionsSubtitle: 'Run verification workflows or navigate back.',
      modal: {
        approveTitle: 'Approve Clinic Registration',
        rejectTitle: 'Reject Clinic Application',
        approveDescription: 'This clinic will be marked as verified and the owner will be notified.',
        rejectDescription: 'This application will be rejected. Please provide a reason below.',
        notesLabel: 'Verification Notes',
        notesPlaceholderApprove: 'Add any notes about the verification (optional)',
        notesPlaceholderReject: 'Explain why this application is being rejected (required)',
        notesHintApprove: 'These notes will be visible to other admins',
        notesHintReject: 'The owner will see this reason',
        rejectWarning: 'Please provide a reason for rejection',
        cancelButton: 'Cancel',
        processing: 'Processing...',
        confirmApprove: 'Approve Clinic',
        confirmReject: 'Reject Application'
      },
      actionBack: 'Back to directory',
      actionBackHint: 'View all clinics',
      actionRefresh: 'Refresh data',
      actionRefreshHint: 'Pull latest records',
      actionVerify: 'Verification workflow',
      actionVerifyHint: 'Approve or reject',
      actionApprove: 'Approve Clinic',
      actionReject: 'Reject Application',
      statusVerified: 'Verified Clinic',
      verifiedOn: 'Verified on',
      statusRejected: 'Application Rejected',
      notesTitle: 'Notes',
      notesPlaceholder: 'Use the verification workflow to capture review notes, supporting files, and compliance comments. Notes recorded here help downstream teams understand onboarding decisions.',
      legalEntityLabel: 'Legal entity:',
      metricTotalBranches: 'Total Branches',
      metricTotalBranchesHint: 'Locations registered',
      metricStaff: 'Staff Members',
      metricStaffHint: 'Active assignments',
      metricOwner: 'Owner',
      metricPrimaryBranch: 'Primary Branch',
      primaryBranchSummary: '{{count}} staff • {{location}}',
      primaryBranchMissing: 'Assign a main branch to track staffing.',
      notAssigned: 'Not assigned',
      noEmail: 'No email',
      noLocation: 'No location',
      docNIB: 'NIB Number',
      docNPWP: 'NPWP Number',
      docOperational: 'Operational License',
      docAdditional: 'Additional Licenses',
      complianceFilesTitle: 'Compliance Documents',
      docUploadedPlaceholder: 'Uploaded',
      docFilesSuffix: 'files',
      operationalOverviewTitle: 'Operational Overview',
      operationalOverviewSubtitle: 'Owner identity, contacts, and compliance credentials.',
      ownerSectionTitle: 'Owner / PIC',
      contactSectionTitle: 'Clinic Contact',
      fieldEmail: 'Email',
      fieldWhatsapp: 'WhatsApp',
      fieldNik: 'NIK',
      fieldPhone: 'Phone',
      fieldTimezone: 'Timezone',
      fieldCreated: 'Created',
      fieldUpdated: 'Updated',
      fieldVerificationNotes: 'Verification notes'
    },
    revenueBilling: {
      badge: 'Financial Overview',
      title: 'Revenue & Billing',
      subtitle: 'Comprehensive financial insights, payment processing, and subscription management.',
      systemStatus: 'system status: optimal',
      downloadReport: 'Download Report',
      tabs: {
        overview: 'Overview',
        transactions: 'Transactions',
        invoices: 'Invoices',
        settings: 'Settings'
      },
      cards: {
        totalRevenue: 'Total Revenue',
        mrr: 'Monthly Recurring',
        activeSubscriptions: 'Active Subscriptions',
        pendingInvoices: 'Pending Invoices'
      },
      charts: {
        revenueGrowth: {
          title: 'Revenue Growth',
          subtitle: 'Monthly revenue vs expenses'
        },
        timeRanges: {
          last12Months: 'Last 12 Months',
          last6Months: 'Last 6 Months',
          last30Days: 'Last 30 Days'
        },
        legend: {
          revenue: 'Revenue',
          expenses: 'Expenses'
        },
        subscriptionTiers: {
          title: 'Subscription Tiers',
          subtitle: 'Distribution of active plans',
          tiers: {
            basic: 'Basic',
            professional: 'Professional',
            enterprise: 'Enterprise'
          }
        }
      },
      transactions: {
        recentTitle: 'Recent Transactions',
        viewAll: 'View All',
        table: {
          id: 'Transaction ID',
          entity: 'Entity',
          typePlan: 'Type / Plan',
          amount: 'Amount',
          status: 'Status',
          action: 'Action'
        },
        status: {
          success: 'Success',
          pending: 'Pending',
          failed: 'Failed'
        }
      },
      invoices: {
        title: 'Invoices',
        subtitle: 'Manage and track all invoices',
        createInvoice: 'Create Invoice',
        loadMore: 'Load More Invoices',
        table: {
          id: 'Invoice ID',
          client: 'Client',
          date: 'Date',
          dueDate: 'Due Date',
          amount: 'Amount',
          status: 'Status',
          action: 'Action'
        },
        status: {
          paid: 'Paid',
          pending: 'Pending',
          overdue: 'Overdue'
        }
      },
      settings: {
        saveChanges: 'Save Changes',
        general: {
          title: 'General Configuration',
          subtitle: 'Manage billing preferences',
          paymentGateway: 'Payment Gateway',
          paymentGatewayHint: 'Current active payment processor.',
          defaultCurrency: 'Default Currency',
          taxRate: 'Tax Rate (%)'
        },
        automation: {
          title: 'Automation',
          subtitle: 'Automated billing tasks',
          autoGenerate: 'Auto-generate Invoices',
          autoGenerateHint: 'Create invoices automatically upon renewal.',
          reminders: 'Payment Reminders',
          remindersHint: 'Send email reminders for upcoming/overdue bills.',
          gatewayStatus: 'Gateway Status',
          midtransConnection: 'Midtrans Connection:',
          active: 'Active'
        }
      }
    },
    aiPlatform: {
      badge: 'AI Platform',
      title: 'AI Platform',
      subtitle: 'AI usage monitoring, model management, and machine learning operations',
      systemStatus: 'AI Models: Active',
      settings: 'AI Settings',
      deploy: 'Deploy Model',
      tabs: {
        overview: 'Overview',
        usage: 'Usage',
        models: 'Models'
      },
      cards: {
        totalRequests: 'Total Requests',
        tokenUsage: 'Token Usage',
        avgLatency: 'Avg. Latency',
        errorRate: 'Error Rate'
      },
      charts: {
        usageTrends: {
          title: 'AI Usage Trends',
          subtitle: 'Token consumption vs request volume'
        },
        timeRanges: {
          last24Hours: 'Last 24 Hours',
          last7Days: 'Last 7 Days',
          last30Days: 'Last 30 Days'
        },
        legend: {
          tokens: 'Tokens (k)',
          requests: 'Requests'
        }
      },
      models: {
        title: 'Model Performance',
        subtitle: 'Efficiency and cost analysis per model',
        refresh: 'Refresh',
        table: {
          modelName: 'Model Name',
          contextWindow: 'Context Window',
          costPer1k: 'Cost / 1k Tokens',
          requests: 'Requests (24h)',
          status: 'Status',
          action: 'Action'
        },
        status: {
          operational: 'Operational',
          degraded: 'Degraded',
          maintenance: 'Maintenance'
        }
      },
      activity: {
        title: 'Recent Activity',
        viewAll: 'View All Logs',
        table: {
          timestamp: 'Timestamp',
          user: 'User / Clnic',
          model: 'Model',
          tokens: 'Tokens',
          status: 'Status'
        },
        status: {
          completed: 'Completed',
          processing: 'Processing',
          failed: 'Failed'
        }
      }
    },
    supportHelpdesk: {
      badge: 'Support & Helpdesk',
      title: 'Support & Helpdesk',
      subtitle: 'Customer support management, ticketing system, and knowledge base administration',
      openTickets: 'open tickets',
      newTicket: 'New Ticket',
      knowledgeBase: 'Knowledge Base',
      tabs: {
        tickets: 'Tickets',
        liveChat: 'Live Chat',
        knowledgeBase: 'Knowledge Base'
      },
      cards: {
        openTickets: 'Open Tickets',
        avgResponseTime: 'Avg. Response Time',
        resolutionRate: 'Resolution Rate',
        csatScore: 'CSAT Score'
      },
      charts: {
        ticketVolume: {
          title: 'Ticket Volume',
          subtitle: 'New vs Resolved tickets over time'
        },
        timeRanges: {
          last7Days: 'Last 7 Days',
          last30Days: 'Last 30 Days',
          last90Days: 'Last 90 Days'
        },
        legend: {
          new: 'New Tickets',
          resolved: 'Resolved'
        }
      },
      tickets: {
        title: 'Recent Tickets',
        viewAll: 'View All Tickets',
        table: {
          subject: 'Subject',
          requester: 'Requester',
          priority: 'Priority',
          status: 'Status',
          time: 'Time'
        },
        priority: {
          high: 'High',
          medium: 'Medium',
          low: 'Low'
        },
        status: {
          open: 'Open',
          inProgress: 'In Progress',
          resolved: 'Resolved',
          closed: 'Closed'
        }
      },
      team: {
        title: 'Team Performance',
        subtitle: 'Agent productivity and satisfaction ratings',
        table: {
          agent: 'Agent',
          resolved: 'Resolved',
          avgTime: 'Avg. Time',
          rating: 'Rating'
        }
      },
      liveChat: {
        sidebarTitle: 'Active Chats',
        searchPlaceholder: 'Search chats...',
        typing: 'typing...',
        inputPlaceholder: 'Type a message...',
        send: 'Send',
        endChat: 'End Chat',
        transfer: 'Transfer',
        noChatSelected: 'Select a chat to start messaging'
      },
      knowledgeContent: {
        searchPlaceholder: 'How can we help today?',
        categories: {
          gettingStarted: 'Getting Started',
          accountBilling: 'Account & Billing',
          technicalSupport: 'Technical Support',
          features: 'Features & Tutorials'
        },
        popularArticles: 'Popular Articles',
        viewAll: 'View All Articles'
      }
    },
    systemAdmin: {
      badge: 'System Administration',
      title: 'System Administration',
      subtitle: 'Platform configuration, user management, and system monitoring',
      systemHealth: 'System Health: Optimal',
      systemConfig: 'System Config',
      security: 'Security',
      tabs: {
        health: 'System Health',
        users: 'User Management',
        audit: 'Audit Logs',
        integrations: 'Integrations'
      },
      health: {
        cpuUsage: 'CPU Usage',
        memoryUsage: 'Memory Usage',
        storageUsage: 'Storage',
        apiLatency: 'API Latency',
        services: {
          database: 'Database',
          redis: 'Redis Cache',
          storage: 'Object Storage',
          email: 'Email Service'
        },
        status: {
          operational: 'Operational',
          degraded: 'Degraded',
          down: 'Down'
        }
      },
      users: {
        title: 'User Management',
        subtitle: 'Manage administrative and staff access',
        addUser: 'Add User',
        table: {
          user: 'User',
          role: 'Role',
          status: 'Status',
          lastLogin: 'Last Login',
          actions: 'Actions'
        },
        roles: {
          admin: 'Administrator',
          manager: 'Manager',
          staff: 'Staff',
          support: 'Support'
        },
        status: {
          active: 'Active',
          inactive: 'Inactive',
          suspended: 'Suspended'
        }
      },
      audit: {
        title: 'Audit Logs',
        subtitle: 'Track system activities and security events',
        export: 'Export Logs',
        table: {
          action: 'Action',
          user: 'User',
          ipAddress: 'IP Address',
          time: 'Time',
          status: 'Status'
        }
      },
      integrations: {
        title: 'Integration Settings',
        subtitle: 'Manage third-party services and connections',
        card: {
          connected: 'Connected',
          disconnected: 'Disconnected',
          configure: 'Configure'
        }
      }
    },
    complianceSecurity: {
      badge: 'Compliance & Security',
      title: 'Compliance & Security',
      subtitle: 'Data privacy controls, regulatory compliance, and security audit management',
      securityScore: 'Security Score',
      securityAudit: 'Security Audit',
      alerts: 'Alerts',
      tabs: {
        overview: 'Security Overview',
        audit: 'Audit Trail',
        standards: 'Compliance Standards',
        privacy: 'Data Privacy'
      },
      overview: {
        threatsBlocked: 'Threats Blocked',
        activeAlerts: 'Active Alerts',
        scoreLabel: 'Overall Security Score',
        riskLevel: 'Risk Level',
        low: 'Low',
        medium: 'Medium',
        high: 'High',
        securityTrend: 'Security Trend',
        deviceHygiene: 'Device Hygiene',
        compliantDevices: 'Compliant Devices',
        nonCompliant: 'Non-Compliant'
      },
      audit: {
        title: 'Security Audit Trail',
        subtitle: 'Detailed log of security-related events and access',
        table: {
          event: 'Event',
          actor: 'Actor',
          resource: 'Resource',
          severity: 'Severity',
          time: 'Time',
          details: 'Details'
        },
        filters: {
          all: 'All Events',
          high: 'High Severity',
          medium: 'Medium Severity',
          low: 'Low Severity'
        }
      },
      standards: {
        title: 'Compliance Standards',
        subtitle: 'Status of regulatory compliance frameworks',
        controls: 'Controls Implemented',
        nextAudit: 'Next Audit',
        days: 'days',
        evidenceLocker: 'Evidence Locker',
        status: {
          passed: 'Certified',
          failed: 'Non-Compliant',
          pending: 'In Progress'
        }
      },
      privacy: {
        title: 'Data Privacy Settings',
        subtitle: 'Manage data retention, encryption, and subject rights',
        export: 'Export Personal Data',
        forget: 'Right to be Forgotten',
        consentLog: 'Consent Log',
        optIn: 'Opt-In',
        optOut: 'Opt-Out',
        groups: {
          patient: 'Patient Data',
          employee: 'Employee Data',
          system: 'System Data'
        },
        settings: {
          retention: 'Data Retention Policy',
          encryption: 'Encryption at Rest',
          anonymization: 'Data Anonymization',
          consent: 'Consent Management',
          accessControl: 'Strict Access Control',
          auditLogging: 'Comprehensive Audit Logging'
        }
      }
    },
    partnerships: {
      badge: 'Partnership Ecosystem',
      title: 'Partnerships',
      subtitle: 'Partner directory, API management, and integration oversight',
      tabs: {
        overview: 'Ecosystem Vitals',
        directory: 'Partner Registry',
        agreements: 'Agreements',
        integrations: 'Integration Pulse'
      },
      overview: {
        activePartners: 'Active Partners',
        apiCalls: 'API Calls (24h)',
        revenueShare: 'Revenue Share',
        growthVitals: 'Growth Vitals',
        recentActivity: 'Clinical Notes',
        health: {
          healthy: 'Healthy',
          critical: 'Critical',
          stable: 'Stable'
        }
      },
      directory: {
        title: 'Partner Registry',
        subtitle: 'Authorized ecosystem partners and clinics',
        tier: {
          gold: 'Specialist (Gold)',
          silver: 'Practitioner (Silver)',
          bronze: 'Resident (Bronze)'
        },
        status: {
          online: 'Online',
          offline: 'Offline',
          maintenance: 'Maintenance'
        }
      },
      agreements: {
        title: 'Agreement Lifecycle',
        subtitle: 'Contract management and renewal tracking',
        stages: {
          triage: 'Triage (Prospect)',
          diagnosis: 'Diagnosis (Negotiation)',
          treatment: 'Treatment (Active)',
          recovery: 'Recovery (Renewal)'
        }
      },
      integrations: {
        title: 'Integration Pulse',
        subtitle: 'Real-time API health and connection monitoring',
        latency: 'Latency',
        uptime: 'Uptime',
        requests: 'Requests/min'
      }
    },
    contentManagement: {
      badge: 'Content Hub',
      title: 'Content Management',
      subtitle: 'Marketing materials, education resources, and content library',
      overview: {
        activeArticles: 'Active Articles',
        totalViews: 'Total Views',
        avgReadTime: 'Avg. Read Time',
        engagementVitals: 'Engagement Vitals',
        clinicalNotes: 'Content Updates'
      },
      status: {
        published: 'Discharged (Published)',
        review: 'Diagnosis (Review)',
        draft: 'Triage (Draft)',
        observation: 'Observation'
      },
      workflow: {
        draft: 'Draft (Triage)',
        review: 'Clinical Review',
        approval: 'Final Approval',
        published: 'Published (Discharged)'
      }
    }
  },
  clinic: {
    sidebar: {
      publicProfile: 'Public Profile',
      descriptions: {
        publicProfile: 'Services, Gallery & Facilities'
      }
    },
    teledentistry: {
      title: 'Teledentistry',
      subtitle: 'Monitor sessions, finalized summaries, and clinic-level teledentistry audits.',
      liveCount: 'Live',
      date: {
        today: 'Today',
        tomorrow: 'Tomorrow',
        yesterday: 'Yesterday'
      },
      tabs: {
        live: 'Live Sessions',
        history: 'Session History',
        audit: 'Audit Log'
      },
      accessDenied: 'This clinic role can only view appointment status. Teledentistry access requires a clinic owner or clinic admin.',
      adminLimitedAccess: 'You have access to history and summaries based on clinic policy. Live monitoring is only available to clinic owners.',
      empty: {
        liveTitle: 'No active sessions yet',
        liveDescription: 'There are no active teledentistry sessions.',
        historyTitle: 'No session history yet',
        historyDescription: 'There is no session history for this date.',
        auditTitle: 'Audit log is empty',
        auditDescription: 'No audit events found.'
      },
      actions: {
        viewSummary: 'View Summary',
        viewChat: 'Chat History',
        observe: 'Observe',
        refreshAudit: 'Refresh Audit',
        close: 'Close'
      },
      filters: {
        eventType: 'Filter event type'
      },
      labels: {
        summary: 'Summary',
        activeParticipants: 'Active participants',
        observer: 'Observer',
        duration: 'Duration',
        appointment: 'Appointment',
        quality: 'Quality',
        localChatMessages: 'local chat_messages'
      },
      statuses: {
        live: 'Live',
        waiting: 'Waiting',
        completed: 'Completed',
        ended: 'Ended',
        unknown: 'Unknown'
      },
      summaryStatuses: {
        finalized: 'Final',
        amended: 'Amended',
        draft: 'Draft',
        pending: 'Pending'
      },
      roles: {
        dentist: 'Dentist',
        patient: 'Patient',
        guardian: 'Guardian',
        interpreter: 'Interpreter',
        assistant: 'Assistant',
        observer: 'Clinic Observer',
        participant: 'Participant',
        system: 'system'
      },
      categories: {
        session: 'Session',
        observer: 'Observer',
        security: 'Security',
        chat: 'Chat',
        summary: 'Summary',
        attachment: 'Attachment',
        system: 'System'
      },
      summaryDrawer: {
        title: 'Clinical Summary',
        patientFallback: 'Patient',
        closeAria: 'Close summary',
        loading: 'Loading summary...',
        unavailable: 'Summary is not finalized or clinical content is unavailable for this clinic role.',
        chiefComplaint: 'Chief complaint',
        objectiveFindings: 'Objective findings',
        assessment: 'Assessment',
        plan: 'Treatment plan',
        recommendations: 'Follow-up recommendations',
        followUp: 'Follow-up',
        followUpYes: 'Yes',
        followUpNo: 'No'
      },
      messagesDrawer: {
        title: 'Consultation Chat History',
        closeAria: 'Close chat history',
        policyCopy: 'Clinic owners can review local chat archives for compliance. Attachment downloads are not available in clinic review mode.',
        loading: 'Loading chat history...',
        empty: 'No chat messages have been synchronized to the local archive yet.',
        attachmentFallback: 'Attachment',
        attachmentStored: 'Attachment is stored, but download is disabled for clinic review.',
        attachmentUnavailable: 'Attachment unavailable ({{reason}}).',
        unavailableReason: 'expired/deleted'
      },
      observer: {
        title: 'Clinic Monitoring Mode',
        appointmentMeta: 'Appointment #{{appointmentId}} · teledentistry session monitoring',
        policyCopy: 'Observer connects without camera/mic. Token misuse is audited and can trigger disconnect.',
        connecting: 'Connecting observer to room...',
        connectedWaiting: 'Connected as observer. Waiting for participant video.',
        reconnecting: 'Connection lost, trying to reconnect...',
        disconnected: 'Session has ended or observer connection was disconnected.',
        roomEnded: 'Session has ended. Observer cannot join again.',
        openFailed: 'Failed to open observer room.'
      },
      errors: {
        auditFailed: 'Failed to load teledentistry audit log. Please try again.',
        sessionsFailed: 'Failed to load clinic teledentistry sessions.',
        summaryFailed: 'Failed to load clinical summary.',
        messagesFailed: 'Failed to load consultation chat history.',
        forbidden: 'Teledentistry access is not allowed for this account.',
        appointmentNotFound: 'Appointment was not found.'
      }
    },
    billing: {
      title: 'Billing & Insurance',
      subtitle: 'Manage invoices, payments, and insurance claims',
      tabs: {
        invoices: 'Invoice',
        payments: 'Payments',
        claims: 'Insurance Claims',
        promos: 'Promos & Packages'
      },
      payments: {
        title: 'Payment History',
        searchPlaceholder: 'Search payments...',
        allMethods: 'All Methods',
        recordPayment: 'Record Payment',
        stats: {
          total: 'Total Payments',
          completed: 'Completed',
          pending: 'Pending',
          today: 'Today'
        },
        methods: {
          cash: 'Cash',
          transfer: 'Bank Transfer',
          qris: 'QRIS',
          debit: 'Debit Card',
          credit: 'Credit Card'
        },
        status: {
          completed: 'Success',
          pending: 'Pending',
          failed: 'Failed',
          refunded: 'Refunded'
        },
        table: {
          paymentId: 'Payment ID',
          invoice: 'Invoice',
          patient: 'Patient',
          amount: 'Amount',
          method: 'Method',
          receivedBy: 'Received By',
          status: 'Status',
          actions: 'Actions'
        }
      }
    },
    publicProfile: {
      badge: 'Public Profile',
      title: 'Clinic Public Profile',
      subtitle: 'Manage how your clinic appears to patients in the Serene mobile app.',
      actions: {
        preview: 'Preview mobile view',
        refresh: 'Refresh content'
      },
      tabs: {
        services: 'Services & Pricing',
        gallery: 'Gallery & Photos',
        highlights: 'Highlights',
        facilities: 'Facilities'
      },
      tabDescriptions: {
        services: 'Update services, pricing, and availability shown to patients.',
        gallery: 'Organize hero images and gallery photos.',
        highlights: 'Promote unique experiences and treatment strengths.',
        facilities: 'Showcase amenities and equipment available at the clinic.'
      }
    },
    staff: {
      // Existing translations
      badge: 'Staff Management',
      title: 'Staff Management',
      subtitle: 'Manage clinic team, roles, and branch assignments',
      totalStaff: 'total staff',

      // Multi-branch extensions
      branches: {
        title: 'Branch Assignment',
        allBranches: 'All Branches',
        unassigned: 'Unassigned',
        assignToBranch: 'Assign to Branch',
        currentBranch: 'Current Branch',
        branchInfo: 'Branch Information',
        moveStaff: 'Move Staff',
        filterByBranch: 'Filter by Branch'
      },

      // Table columns
      table: {
        staff: 'Staff',
        contact: 'Contact',
        role: 'Role',
        branch: 'Branch',
        status: 'Status',
        actions: 'Actions'
      },

      // Actions
      actions: {
        addStaff: 'Add Staff',
        viewProfile: 'View Profile',
        editRole: 'Edit Role',
        changeBranch: 'Change Branch',
        remove: 'Remove'
      },

      // Modals
      modals: {
        invite: {
          badge: 'Invite Staff',
          title: 'Invite New Staff Member',
          subtitle: 'Add a new team member to your clinic',
          fields: {
            name: 'Full Name',
            email: 'Email Address',
            password: 'Password',
            role: 'Role',
            position: 'Position',
            department: 'Department',
            branch: 'Assigned Branch'
          },
          placeholders: {
            name: 'Enter full name',
            email: 'Enter email address',
            password: 'Enter temporary password',
            position: 'Enter position (optional)',
            department: 'Enter department (optional)',
            branch: 'Select branch assignment'
          },
          hints: {
            password: 'Minimum 6 characters. Staff can change password after first login.',
            branch: 'Staff will be assigned to work at this branch location.'
          },
          actions: {
            cancel: 'Cancel',
            submit: 'Send Invitation',
            sending: 'Sending...'
          }
        },

        changeBranch: {
          title: 'Change Branch Assignment',
          subtitle: 'Move staff member to different branch',
          currentBranch: 'Current Branch',
          newBranch: 'New Branch',
          reason: 'Reason for Transfer',
          actions: {
            cancel: 'Cancel',
            confirm: 'Change Branch',
            changing: 'Processing...'
          }
        }
      },

      // Branch info
      branchInfo: {
        mainBranch: 'Main Branch',
        address: 'Address',
        phone: 'Phone',
        facilities: 'Facilities',
        operatingHours: 'Operating Hours',
        treatmentRooms: 'Treatment Rooms',
        sterilization: 'Sterilization',
        radiography: 'Radiography'
      },

      // Status and labels
      status: {
        active: 'Active',
        inactive: 'Inactive',
        onLeave: 'On Leave'
      },

      roles: {
        owner: 'Owner',
        manager: 'Manager',
        dentist: 'Dentist',
        nurse: 'Nurse',
        receptionist: 'Receptionist',
        admin: 'Admin'
      }
    },
    reports: {
      title: 'Reports & KPI',
      subtitle: 'Analytics, performance, and business intelligence',
      tabs: {
        operational: 'Operational',
        financial: 'Financial',
        compliance: 'Compliance',
        marketing: 'Marketing'
      },
      operational: {
        roomUtilization: 'Room Utilization',
        avgWaitTime: 'Average Wait Time',
        satisfaction: 'Patient Satisfaction',
        completionRate: 'Completion Rate',
        appointmentStats: 'Weekly Appointment Stats',
        roomUsage: 'Room Usage',
        treatmentDistribution: 'Treatment Distribution',
        staffPerformance: 'Staff Performance'
      },
      financial: {
        totalRevenue: 'Total Revenue',
        treatmentRevenue: 'Revenue by Treatment',
        expenses: 'Expenses',
        profitMargin: 'Profit Margin',
        cashPayments: 'Cash Payments',
        paymentMethods: 'Payment Methods',
        outstandingInvoices: 'Outstanding Invoices',
        outstandingList: 'Outstanding Invoice List',
        monthlyTrend: 'Monthly Revenue Trend'
      },
      compliance: {
        overallScore: 'Compliance Score',
        dataPrivacy: 'Data Privacy',
        consentForms: 'Consent Forms',
        recordKeeping: 'Record Keeping',
        security: 'Security Controls',
        consentStatus: 'Consent Status',
        auditLogs: 'Audit Logs',
        dataBackups: 'Data Backups',
        privacyRequirements: 'Privacy Requirements',
        securityIncidents: 'Security Incidents'
      },
      marketing: {
        newPatients: 'New Patients',
        campaignPerformance: 'Campaign Performance',
        acquisitionSources: 'Acquisition Sources',
        referralRate: 'Referral Rate',
        recallProgram: 'Recall Program',
        recallSuccess: 'Recall Success Rate',
        topReferrers: 'Top Referrers',
        socialMedia: 'Social Media Performance',
        activeCampaigns: 'Active Campaigns',
        contentPerformance: 'Content Performance',
        campaignROI: 'Campaign ROI'
      }
    }
  },
  notifications: {
    common: {
      notifications: 'Notifications',
      markAllRead: 'Mark all read',
      markAsRead: 'Mark as read',
      settings: 'Notification settings',
      preferences: 'Notification preferences',
      focusMode: 'Focus mode',
      new: 'NEW',
      priority: 'Priority',
      emptyTitle: 'No notifications',
      emptyDescription: 'Everything looks calm. We will notify you when new updates arrive.',
      updatedAt: 'Updated {{time}}',
      asOf: 'As of {{time}}',
      updatesCount: '{{count}} updates',
      notificationsCount: '{{count}} notifications'
    },
    filters: {
      all: 'All',
      network: 'Network',
      billing: 'Revenue & Billing',
      ai: 'AI Platform',
      support: 'Support',
      compliance: 'Compliance',
      analytics: 'Analytics',
      partnership: 'Partnerships',
      schedule: 'Schedule & Queue',
      patient: 'Patients',
      operations: 'Operations',
      marketing: 'Experience',
      appointments: 'Appointments',
      teledentistry: 'Virtual Care',
      clinical: 'Clinical Work',
      business: 'Business',
      security: 'Security'
    },
    admin: {
      title: 'Admin Control Center',
      subtitle: 'Monitor onboarding, revenue signals, and compliance alerts in real time.',
      stats: {
        totalLabel: 'Total signals',
        totalDescription: 'Across all admin touchpoints',
        unreadLabel: 'Unread alerts',
        unreadMeta: 'Needs review',
        unreadDescription: '{{count}} require action in the next 4h',
        criticalLabel: 'Critical workflows',
        criticalMeta: 'High severity',
        criticalDescription: 'Escalated to ops & compliance'
      },
      sections: {
        insights: 'Signals',
        escalations: 'Escalations',
        playbooks: 'Playbooks'
      },
      labels: {
        escalated: 'Escalated'
      }
    },
    clinic: {
      title: 'Clinic Notification Hub',
      subtitle: 'Real-time queue, patient, and operations signals for your branches.',
      stats: {
        totalLabel: "Today's updates",
        totalDescription: 'Combined schedule, patient, and billing updates',
        unreadLabel: 'Unread alerts',
        unreadMeta: 'Need attention',
        unreadDescription: 'Includes queue & insurance priorities',
        opsLabel: 'Operational tasks',
        opsMeta: 'Ops & inventory',
        opsDescription: 'Keep sterilization and stock healthy'
      },
      sections: {
        insights: 'INSIGHT',
        alerts: 'Operational Alerts',
        playbooks: 'PLAYBOOK'
      },
      emptyTitle: 'No updates',
      emptyDescription: 'All clear in this area. The system will notify you when something changes.'
    },
    dentist: {
      title: 'Dentist Notification Center',
      subtitle: 'Sync schedules, virtual consults, and clinical insights in one place.',
      stats: {
        totalLabel: 'Total signals',
        totalMeta: 'Past 24 hours',
        totalDescription: 'Includes schedule and clinical alerts',
        unreadLabel: 'Unread',
        unreadMeta: 'Need action',
        unreadDescription: 'Teleconsult + AI alerts',
        clinicalLabel: 'Clinical tasks',
        clinicalMeta: 'Need review',
        clinicalDescription: 'Lab cases, AI insights, consent'
      },
      sections: {
        insights: 'INSIGHT',
        alerts: 'Focus Items',
        playbooks: 'PLAYBOOK'
      },
      emptyTitle: 'No notifications',
      emptyDescription: 'Everything looks good. We will notify you when new updates arrive.'
    }
  },
  settings: {
    title: 'Settings',
    profile: 'Profile',
    billing: 'AI Billing',
    practice: 'Practice',
    security: 'Security',
    preferences: 'Preferences',
    personalInformation: 'Personal Information',
    personalPreferences: 'Personal Preferences',
    managePersonalProfessional: 'Manage your personal and professional information.',
    profileSettings: 'Profile Settings',
    name: 'Full Name',
    enterFullName: 'Enter full name',
    notFilledYet: 'Not filled yet',
    uploading: 'Uploading...',
    uploadImage: 'Upload Image',
    preferencesSettings: 'Display & Preferences',
    preferencesSaved: 'Preferences saved successfully!',
    resetPreferencesConfirm: 'Reset preferences to their default values?',
    themeDisplay: 'Appearance & Display',
    theme: 'Theme',
    light: 'Light',
    dark: 'Dark',
    system: 'System',
    language: 'Language',
    english: 'English',
    indonesian: 'Indonesian',
    fontSize: 'Font Size',
    small: 'Small',
    large: 'Large',
    timezone: 'Time Zone',
    dateFormat: 'Date Format',
    timeFormat: 'Time Format',
    currency: 'Currency',
    notifications: 'Notifications',
    emailNotifications: 'Email notifications',
    emailNotificationsDesc: 'Receive receipts, billing alerts, and new patient updates.',
    pushNotifications: 'Push notifications',
    pushNotificationsDesc: 'Show alerts on this device for appointments and urgent tasks.',
    appointmentReminders: 'Appointment reminders',
    appointmentRemindersDesc: 'Send reminders to patients ahead of their visits.',
    marketingEmails: 'Marketing emails',
    marketingEmailsDesc: 'Get product tips, campaigns, and feature announcements.',
    systemUpdates: 'System updates',
    systemUpdatesDesc: 'Notify me about downtime, releases, and security notices.',
    reminderSound: 'Reminder sound',
    reminderSoundDesc: 'Play a sound for tasks and appointment reminders.',
    reduceMotion: 'Reduce motion',
    reduceMotionDesc: 'Limit animations for a calmer interface.',
    autoSave: 'Auto-save changes',
    autoSaveDesc: 'Save updates automatically while editing.',
    showTips: 'Show product tips',
    showTipsDesc: 'Display contextual suggestions inside the app.',
    dataSharing: 'Share usage data',
    dataSharingDesc: 'Allow anonymous analytics to improve the product.',
    analytics: 'AI analytics opt-in',
    analyticsDesc: 'Help improve AI accuracy with aggregated usage data.',
    privacy: 'Privacy',
    profileVisibility: 'Profile visibility',
    public: 'Public',
    limited: 'Limited',
    private: 'Private'
  },
  dentist: {
    settings: {
      badge: 'Account Configuration',
      subtitle: 'Manage your profile, AI billing, and practice configuration'
    }
  },
  dentistPatient: {
    common: {
      noPatientSelected: 'No patient selected',
      cancel: 'Cancel',
      add: 'Add',
      viewMode: 'View Mode',
      editMode: 'Edit Mode',
      export: 'Export History',
      notProvided: 'Not provided',
      minutes: '{{minutes}} min'
    },
    tabs: {
      profile: 'Profile',
      aiResults: 'AI Results',
      appointments: 'Appointments',
      medicalHistory: 'Medical History',
      treatmentPlan: 'Treatment Plan',
      billing: 'Billing',
      communication: 'Communication'
    },
    emptyState: {
      title: 'Select a Patient',
      subtitle: 'Choose a patient from the list to view their details'
    },
    header: {
      tagline: 'Patient Management System',
      title: 'Patient Management',
      subtitle: 'Comprehensive patient care and clinical management platform',
      actions: {
        addPatient: 'Add Patient'
      },
      stats: {
        totalPatients: 'Total Patients',
        activePatients: 'Active Patients',
        todaysAppointments: "Today's Appointments",
        aiAnalyzed: 'AI-Analyzed Patients'
      }
    },
    addPatient: {
      title: 'Add New Patient',
      sections: {
        personalInfo: 'Personal Information',
        schedule: 'Schedule First Appointment'
      },
      fields: {
        name: 'Full Name *',
        phone: 'Phone Number *',
        email: 'Email Address *',
        age: 'Age *',
        gender: 'Gender *',
        appointmentDate: 'Date *',
        appointmentTime: 'Time *',
        appointmentType: 'Appointment Type',
        notes: 'Notes'
      },
      placeholders: {
        name: "Enter patient's full name",
        phone: '+62-xxx-xxxx-xxxx',
        email: 'patient@email.com',
        age: '25',
        notes: 'Additional notes about the patient or appointment...'
      },
      genderOptions: {
        placeholder: 'Select gender',
        male: 'Male',
        female: 'Female'
      },
      appointmentTypes: {
        consultation: 'Consultation',
        checkup: 'Regular Checkup',
        cleaning: 'Cleaning',
        treatment: 'Treatment',
        emergency: 'Emergency'
      },
      actions: {
        cancel: 'Cancel',
        submit: 'Add Patient & Schedule',
        submitting: 'Saving...'
      },
      validation: {
        nameRequired: 'Name is required',
        phoneRequired: 'Phone is required',
        emailRequired: 'Email is required',
        ageRequired: 'Valid age is required',
        genderRequired: 'Gender is required',
        dateRequired: 'Appointment date is required',
        timeRequired: 'Appointment time is required',
        submitFailed: 'Failed to add patient. Please try again.'
      }
    },
    ai: {
      deepDental: {
        workspace: {
          title: 'Case Workspace',
          open: 'Open case workspace',
          close: 'Close case workspace',
          short: 'Workspace',
          header: {
            title: 'Verified Case Workspace',
            description: 'Create a clinical case to attach images, findings, exports, and timeline events.',
            caseId: 'Case {{id}}'
          },
          actions: {
            refresh: 'Refresh',
            createCase: 'Create case'
          },
          tabs: {
            case: 'Case',
            findings: 'Findings',
            audit: 'Audit',
            export: 'Export',
            timeline: 'Timeline'
          },
          imageUpload: {
            title: 'Multi-image case upload',
            subtitle: 'Attach all diagnostic images to one clinical case.',
            imageCount: 'images',
            dropZone: 'Drop dental images here',
            fileFormats: 'JPG, PNG, WebP, HEIC. Multiple files supported.',
            selectButton: 'Select images',
            locked: 'Images are locked after clinician verification.'
          },
          analysis: {
            title: 'AI-assisted analysis',
            subtitle: 'Run only after per-image quality precheck.',
            button: 'Analyze eligible images ({{count}})'
          },
          findings: {
            title: 'Clinician findings',
            subtitle: 'Review AI suggestions separately from final clinician findings.',
            manualFinding: 'Manual finding',
            aiSuggestion: 'AI suggestion',
            noAI: 'No AI suggestions yet.',
            confirmed: 'Clinician confirmed',
            noConfirmed: 'No clinician findings confirmed yet.',
            verifyCase: 'Verify case'
          },
          audit: {
            title: 'Audit trail',
            subtitle: 'Read-only immutable clinical actions.',
            empty: 'No audit events yet.'
          },
          export: {
            title: 'Case export',
            subtitle: 'Generate auditable PDF or JSON reports.',
            redact: 'Redact patient identifier in export payload where supported',
            blocked: 'Link a patient and verify the case before export.',
            pdfButton: 'PDF',
            jsonButton: 'JSON',
            draftLabel: 'DRAFT - NOT CLINICIAN VERIFIED'
          },
          timeline: {
            title: 'Patient timeline',
            subtitle: 'Case milestones linked to longitudinal care.',
            unlinked: 'No patient linked yet.',
            linkPatient: 'Link patient',
            empty: 'No timeline events yet.',
            images: 'images',
            session: 'Session',
            reportLinked: 'Report linked'
          }
        }
      },
      empty: {
        title: 'No AI Analysis Available',
        description: "This patient hasn't used the AI diagnostic feature yet."
      },
      header: {
        title: 'AI Diagnostic Results',
        count: '{{count}} results available'
      },
      controls: {
        select: 'Select Analysis'
      },
      summary: {
        analysisDate: 'Analysis Date',
        confidence: 'Confidence Level',
        risk: 'Risk Level'
      },
      tabs: {
        summary: 'Summary',
        diagnosis: 'Diagnosis',
        symptoms: 'Symptoms',
        recommendations: 'Recommendations',
        images: 'Images'
      },
      diagnosis: {
        title: 'AI Diagnosis',
        probability: 'probability'
      },
      symptoms: {
        title: 'Reported Symptoms',
        severity: 'Severity: {{severity}}'
      },
      recommendations: {
        title: 'AI Recommendations'
      },
      summary: {
        title: 'Analysis Summary',
        analysisDate: 'Analysis Date',
        confidence: 'Confidence Level',
        risk: 'Risk Level',
        empty: 'No summary available for this analysis'
      },
      images: {
        title: 'Analysis Images',
        empty: 'No images available for this analysis'
      },
      riskLevels: {
        high: 'High',
        medium: 'Medium',
        low: 'Low',
        unknown: 'Unknown'
      },
      severityLevels: {
        high: 'High',
        medium: 'Medium',
        low: 'Low',
        severe: 'Severe',
        moderate: 'Moderate',
        mild: 'Mild',
        unknown: 'Unknown'
      },
      urgencyLevels: {
        immediate: 'Immediate',
        soon: 'Soon',
        normal: 'Normal',
        unknown: 'Unknown'
      },
      footer: {
        performedOn: 'AI analysis performed on {{date}}',
        export: 'Export Report',
        share: 'Share with Patient',
        askAI: 'Ask AI',
        closeChat: 'Close Chat'
      },
      chat: {
        title: 'Ask AI About This Result',
        empty: 'No chat history for this analysis.',
        placeholder: 'Ask AI about this result...',
        send: 'Send',
        loading: 'Loading...'
      }
    },
    appointments: {
      title: 'Appointments',
      actions: {
        scheduleNew: 'Schedule New',
        reschedule: 'Reschedule',
        start: 'Start',
        cancel: 'Cancel',
        complete: 'Complete',
        viewDetails: 'View Details',
        scheduleFirst: 'Schedule First Appointment',
        sendReminder: 'Send Reminder'
      },
      summary: {
        total: 'Total',
        upcoming: 'Upcoming',
        completed: 'Completed',
        cancelled: 'Cancelled'
      },
      filters: {
        label: 'Filter by status:',
        all: 'All Appointments'
      },
      statuses: {
        scheduled: 'Scheduled',
        completed: 'Completed',
        cancelled: 'Cancelled',
        noShow: 'No Show',
        inProgress: 'In Progress',
        unknown: 'Unknown'
      },
      history: {
        title: 'Appointment History ({{count}})',
        treatment: 'Treatment Summary',
        followUp: 'Follow-up required'
      },
      empty: {
        title: 'No Appointments Found',
        noAppointments: 'This patient has no appointments yet.',
        noFilterMatches: 'No {{status}} appointments found.'
      },
      next: {
        title: 'Next Appointment'
      },
      labels: {
        duration: '{{minutes}} min'
      }
    },
    billing: {
      title: 'Billing & Payments',
      actions: {
        createInvoice: 'Create Invoice',
        sendStatement: 'Send Statement',
        createNewInvoice: 'Create New Invoice',
        view: 'View',
        markPaid: 'Mark Paid',
        receipt: 'Receipt'
      },
      summary: {
        totalBalance: 'Total Balance',
        paidAmount: 'Paid Amount',
        pending: 'Pending',
        paymentRate: 'Payment Rate'
      },
      insurance: {
        title: 'Insurance Information',
        provider: 'Provider:',
        policy: 'Policy #:',
        coverage: 'Coverage:',
        deductible: 'Deductible Met:'
      },
      tabs: {
        overview: 'Overview',
        invoices: 'Invoices',
        payments: 'Payment History',
        insurance: 'Insurance Claims'
      },
      overview: {
        accountSummary: 'Account Summary',
        recentActivity: 'Recent Activity',
        paymentReceived: 'Payment Received',
        outstandingTitle: 'Outstanding Balance',
        outstandingDescription: 'Payment pending for invoice(s)'
      },
      invoices: {
        title: 'Invoices',
        treatments: 'Treatments:',
        issued: 'Issued: {{date}}',
        due: 'Due: {{date}}',
        paid: 'Paid: {{date}}'
      },
      payments: {
        title: 'Payment History',
        paymentFor: 'Payment for {{invoice}}',
        empty: 'No payment history available'
      },
      insuranceClaims: {
        title: 'Insurance Claims',
        empty: 'Insurance claims feature coming soon'
      },
      invoiceStatuses: {
        paid: 'Paid',
        pending: 'Pending',
        overdue: 'Overdue',
        cancelled: 'Cancelled',
        unknown: 'Unknown'
      },
      paymentStatuses: {
        completed: 'Completed',
        pending: 'Pending',
        failed: 'Failed',
        delivered: 'Delivered',
        sent: 'Sent',
        received: 'Received'
      }
    },
    communication: {
      title: 'Patient Communication',
      actions: {
        scheduleCall: '📞 Schedule Call',
        sendSms: '📱 Send SMS'
      },
      contact: {
        primaryEmail: 'Primary Email',
        phoneNumber: 'Phone Number',
        preferred: 'Preferred Contact',
        defaultPreferred: 'Email'
      },
      quickActions: 'Quick Actions',
      templates: {
        appointment_reminder: {
          name: 'Appointment Reminder',
          subject: 'Upcoming Appointment Reminder',
          content: 'This is a friendly reminder about your upcoming appointment on {date} at {time}. Please arrive 15 minutes early.'
        },
        treatment_followup: {
          name: 'Treatment Follow-up',
          subject: 'How are you feeling after your treatment?',
          content: "We hope you are healing well after your recent treatment. Please don't hesitate to contact us if you have any questions or concerns."
        },
        payment_reminder: {
          name: 'Payment Reminder',
          subject: 'Payment Due Notification',
          content: 'This is a reminder that your payment of {amount} for invoice #{invoice} is due on {due_date}.'
        },
        annual_checkup: {
          name: 'Annual Checkup',
          subject: 'Time for Your Annual Dental Checkup',
          content: "It's been a year since your last checkup. Regular dental examinations are important for maintaining good oral health."
        }
      },
      sendMessage: {
        title: 'Send Message',
        templateLabel: 'Message Template (Optional)',
        templatePlaceholder: 'Select a template...',
        contentLabel: 'Message Content',
        contentPlaceholder: 'Type your message here...',
        clear: 'Clear',
        submit: 'Send Message'
      },
      history: {
        title: 'Communication History',
        duration: 'Duration: {{duration}}',
        responseLabel: 'Patient Response:',
        emptyTitle: 'No Communication History',
        emptySubtitle: 'Start a conversation with this patient'
      },
      directions: {
        outgoing: 'Outgoing',
        incoming: 'Incoming'
      },
      statuses: {
        sent: 'Sent',
        delivered: 'Delivered',
        read: 'Read',
        failed: 'Failed',
        pending: 'Pending',
        received: 'Received',
        completed: 'Completed'
      },
      newMessage: {
        defaultSubject: 'Message from Dentist'
      }
    },
    list: {
      title: 'Patient Directory',
      subtitle: '{{visible}} of {{total}} patients',
      searchPlaceholder: 'Search patients…',
      filters: {
        all: 'All',
        active: 'Active',
        inactive: 'Inactive',
        new: 'New'
      },
      sources: {
        all: 'All Sources',
        serene_mobile: 'Serene Mobile',
        clinic_added: 'Clinic Added'
      },
      actions: {
        open: 'Open Patient Directory',
        close: 'Close Patient Directory'
      },
      loadingDetails: 'Loading patient details...',
      badges: {
        ai: 'AI',
        allergy: 'Allergy'
      },
      labels: {
        noVisits: 'No visits',
        id: 'ID: {{id}}',
        ageShort: '{{age}}y',
        gender: {
          male: 'Male',
          female: 'Female',
          other: 'Other',
          unknown: 'Unknown'
        }
      },
      empty: {
        title: 'No Patients Found',
        adjustFilters: 'Try adjusting your search, filter, or sorting.',
        addFirst: 'Start by adding your first patient from the header above.'
      }
    },
    medicalHistory: {
      title: 'Medical History',
      actions: {
        add: '+ Add',
        cancel: 'Cancel',
        submit: 'Add',
        view: 'View Mode',
        edit: 'Edit Mode',
        export: 'Export History'
      },
      summary: {
        allergies: 'Allergies',
        conditions: 'Conditions',
        medications: 'Medications',
        surgeries: 'Surgeries'
      },
      placeholders: {
        default: 'Add new entry...'
      },
      empty: 'No records yet',
      sections: {
        allergies: {
          title: 'Allergies',
          placeholder: 'Add new allergy...',
          empty: 'No allergies recorded',
          toggle: '+ Add'
        },
        conditions: {
          title: 'Medical Conditions',
          placeholder: 'Add new condition...',
          empty: 'No medical conditions recorded',
          toggle: '+ Add'
        },
        medications: {
          title: 'Current Medications',
          placeholder: 'Add new medication...',
          empty: 'No medications recorded',
          toggle: '+ Add'
        },
        surgeries: {
          title: 'Previous Surgeries',
          placeholder: 'Add new surgery...',
          empty: 'No surgeries recorded',
          toggle: '+ Add'
        }
      },
      severity: {
        high: 'High',
        severe: 'Severe',
        medium: 'Medium',
        moderate: 'Moderate',
        low: 'Low',
        mild: 'Mild',
        unknown: 'Unknown'
      },
      emergency: {
        title: 'Emergency Contact',
        name: 'Name',
        relationship: 'Relationship',
        phone: 'Phone',
        empty: 'No emergency contact information available',
        add: 'Add Emergency Contact'
      },
      family: {
        title: 'Family Medical History',
        empty: 'No family medical history recorded',
        add: 'Add Family History'
      },
      timeline: {
        title: 'Medical History Timeline',
        empty: 'Medical timeline feature coming soon'
      }
    },
    profile: {
      title: 'Patient Profile',
      actions: {
        close: 'Close profile'
      },
      header: {
        nextAppointment: 'Next appointment: {{date}}'
      },
      labels: {
        unknownAge: 'Unknown',
        ageDisplay: '{{age}} years old',
        patientSince: '{{years}}y',
        notAvailable: 'N/A'
      },
      personal: {
        title: 'Personal Information',
        fields: {
          name: 'Full Name',
          patientId: 'Patient ID',
          dob: 'Date of Birth',
          age: 'Age',
          gender: 'Gender',
          maritalStatus: 'Marital Status'
        }
      },
      contact: {
        title: 'Contact Information',
        fields: {
          phone: 'Phone Number',
          email: 'Email Address',
          address: 'Address',
          preferredContact: 'Preferred Contact Method',
          occupation: 'Occupation'
        },
        defaults: {
          preferredContact: 'Email'
        }
      },
      medical: {
        title: 'Medical Summary',
        summary: {
          allergies: 'Allergies',
          conditions: 'Conditions',
          medications: 'Medications',
          none: 'None recorded'
        }
      },
      visits: {
        title: 'Visit Summary',
        totalVisits: 'Total Visits',
        lastVisit: 'Last Visit',
        nextAppointment: 'Next Appointment',
        patientSince: 'Patient Since',
        none: 'None',
        notAvailable: 'N/A'
      },
      statuses: {
        active: 'Active',
        inactive: 'Inactive',
        new: 'New'
      },
      gender: {
        male: 'Male',
        female: 'Female',
        other: 'Other',
        unknown: 'Unknown'
      },
      contactDefaults: {}
    },
    treatmentPlan: {
      title: 'Treatment Plans',
      actions: {
        createNew: 'Create New Plan',
        cancel: 'Cancel',
        create: 'Create Plan',
        editPlan: 'Edit Plan',
        addTreatment: 'Add Treatment',
        complete: 'Complete',
        start: 'Start'
      },
      stats: {
        total: 'Total Plans',
        inProgress: 'In Progress',
        completed: 'Completed',
        totalCost: 'Total Cost'
      },
      form: {
        title: 'Create New Treatment Plan',
        fields: {
          title: 'Plan Title',
          priority: 'Priority',
          description: 'Description',
          estimatedCost: 'Estimated Cost (IDR)',
          estimatedDuration: 'Estimated Duration (weeks)',
          notes: 'Notes'
        },
        placeholders: {
          title: 'Enter treatment plan title...',
          description: 'Describe the treatment plan...',
          notes: 'Additional notes...'
        },
        priorityOptions: {
          low: 'Low Priority',
          medium: 'Medium Priority',
          high: 'High Priority'
        }
      },
      table: {
        plan: {
          startDate: 'Start Date:',
          estimatedCompletion: 'Est. Completion:',
          estimatedCost: 'Est. Cost:',
          actualCost: 'Actual Cost:',
          progress: 'Progress'
        },
        details: {
          title: 'Treatment Details',
          costLabel: '💰'
        }
      },
      statuses: {
        pending: 'Pending',
        'in-progress': 'In Progress',
        completed: 'Completed',
        cancelled: 'Cancelled'
      },
      taskStatuses: {
        pending: 'Pending',
        inprogress: 'In Progress',
        completed: 'Completed',
        cancelled: 'Cancelled'
      },
      priorities: {
        high: 'High',
        medium: 'Medium',
        low: 'Low'
      },
      labels: {
        notScheduled: 'Not scheduled',
        completedOn: '✅ Completed: {{date}}',
        scheduledOn: '📅 Scheduled: {{date}}',
        priorityLabel: '{{priority}} priority'
      },
      empty: {
        title: 'No Treatment Plans',
        description: "Create a treatment plan to start planning this patient's dental care.",
        action: 'Create First Treatment Plan'
      }
    }
  },
  dentistTeledentistry: {
    title: 'Teledentistry',
    subtitle: 'Virtual consultations and session management',
    breadcrumb: {
      portal: 'Dentist Portal',
      teledentistry: 'Teledentistry'
    },
    header: {
      title: 'Teledentistry'
    },
    actions: {
      summary: 'Summary',
      newConsultation: 'New Consultation',
      startCall: 'Start Call',
      connecting: 'Connecting...'
    },
    postCallSummary: {
      title: 'Post-Consultation Summary',
      finalized: 'Summary is finalized and displayed as read-only.'
    },
    newConsultation: {
      title: 'New Consultation',
      subtitle: 'Start a virtual consultation with a patient'
    },
    search: {
      placeholder: 'Search patient...'
    },
    patientInfo: {
      title: 'Patient Info',
      selectPatient: 'Select a conversation to view patient details',
      details: {
        title: 'Patient Details',
        email: 'Email',
        phone: 'Phone',
        role: 'Role',
        notProvided: 'Not provided',
        unknown: 'Unknown patient'
      },
      preSessionForm: {
        title: 'Pre-session health form',
        loading: 'Loading pre-session form...',
        error: 'Pre-session form could not be loaded. The session can still proceed as this form is optional.',
        notFilled: 'Patient has not filled out the pre-session form. This form is optional, so the session can still proceed.',
        submittedBy: 'Filled by patient',
        status: 'Submitted',
        chiefComplaint: 'Chief Complaint',
        painScale: 'Pain Scale',
        allergies: 'Allergies',
        medications: 'Medications',
        additionalNotes: 'Additional Notes',
        notFilled_text: 'Not filled',
        notProvided_text: 'Not provided'
      },
      conversation: {
        title: 'Conversation',
        unread: 'Unread',
        lastActivity: 'Last activity',
        lastRead: 'Last read',
        lastMessage: 'Last message',
        sharedFile: 'Shared file: {{fileName}}',
        attachment: 'Attachment',
        justNow: 'just now',
        minutesAgo: '{{minutes}}m ago',
        hoursAgo: '{{hours}}h ago'
      },
      quickActions: {
        title: 'Quick actions',
        scheduleFollowUp: 'Schedule follow-up',
        viewMedicalHistory: 'View medical history'
      },
      onlineStatus: {
        online: 'Online',
        offline: 'Offline'
      },
      footer: {
        chatDescription: 'Chat, video, and attachments are linked to appointment #{{appointmentId}}. Downloads require an authenticated session and follow the attachment size/type policy.',
        moreContext: 'Need more context? Open the appointment record or patient profile from the clinic dashboard; this panel mirrors live data from the communications API.'
      }
    }
  },
  dentistSchedule: {
    header: {
      title: 'Appointment Schedule',
      greeting: 'Hi, {{name}}',
      fallbackName: 'Dentist Team',
      lastUpdated: 'Last synced {{time}}',
      fetching: 'Syncing latest data…',
      refresh: 'Refresh',
      refreshing: 'Refreshing…',
      viewModes: {
        daily: 'Daily',
        week: 'Weekly',
        month: 'Monthly'
      }
    },
    labels: {
      unknownPatient: 'Unknown patient',
      unknownDentist: 'Assigned dentist'
    },
    status: {
      all: 'All statuses',
      pending: 'Pending',
      confirmed: 'Confirmed',
      checkIn: 'Check-in',
      inChair: 'In Chair',
      completed: 'Completed',
      cancelled: 'Cancelled',
      noShow: 'No-show',
      rescheduleRequested: 'Reschedule Requested'
    },
    summary: {
      total: 'Upcoming',
      pending: 'Pending review',
      confirmed: 'Confirmed',
      cancelled: 'Cancelled'
    },
    actions: {
      confirm: 'Confirm',
      reschedule: 'Reschedule',
      startVideo: 'Start Video',
      requestPhotos: 'Request Photos',
      cancel: 'Cancel',
      viewDetails: 'View Details',
      handleReschedule: 'Handle Reschedule Request',
      checkIn: 'Check-in Patient'
    },
    channels: {
      clinic: 'In-clinic',
      teledentistry: 'Teledentistry'
    },
    filters: {
      title: 'Filters',
      searchLabel: 'Search',
      searchPlaceholder: 'Search by patient, service, or reason...',
      dateRange: {
        label: 'Date Range',
        today: 'Today',
        tomorrow: 'Tomorrow',
        thisWeek: 'This Week',
        thisMonth: 'This Month',
        custom: 'Custom Range'
      },
      status: {
        label: 'Status'
      },
      channel: {
        label: 'Channel'
      },
      provider: {
        label: 'Provider',
        all: 'All Providers'
      },
      location: {
        label: 'Location',
        all: 'All Locations'
      },
      priority: {
        label: 'Priority',
        all: 'All Priorities',
        urgentOnly: 'Urgent Only',
        highRisk: 'High Risk',
        depositRequired: 'Deposit Required'
      },
      channels: {
        all: 'All Channels',
        clinic: 'In-clinic',
        teledentistry: 'Teledentistry'
      },
      actions: {
        clear: 'Clear Filters',
        showPending: 'Show Pending',
        teleOnly: 'Tele Only'
      }
    },
    card: {
      riskTooltip: 'Risk: {{value}}%',
      badges: {
        depositRequired: 'Deposit Required',
        urgent: 'Urgent'
      },
      labels: {
        providerFallback: 'Not assigned',
        locationFallback: 'Location TBD'
      }
    },
    detail: {
      status: {
        pending: 'Pending',
        confirmed: 'Confirmed',
        checkIn: 'Check-in',
        inChair: 'In Chair',
        completed: 'Completed',
        cancelled: 'Cancelled',
        rescheduleRequested: 'Reschedule Requested'
      },
      sections: {
        patientInfo: {
          title: 'Patient Information',
          details: 'Patient Details'
        },
        appointmentDetails: {
          title: 'Appointment Details'
        },
        providerLocation: {
          title: 'Provider & Location'
        },
        riskAssessment: {
          title: 'Risk Assessment',
          labels: {
            high: 'High Risk',
            medium: 'Medium Risk',
            low: 'Low Risk'
          }
        },
        payment: {
          title: 'Payment',
          depositRequired: 'Deposit Required'
        },
        teledentistry: {
          title: 'Teledentistry',
          description: 'Video consultation room is ready'
        }
      },
      fields: {
        name: 'Name',
        patientId: 'Patient ID',
        whatsApp: 'WhatsApp',
        type: 'Type',
        reason: 'Reason',
        reasonFallback: 'Not specified',
        duration: 'Duration',
        minuteUnit: 'minutes',
        provider: 'Provider',
        location: 'Location',
        riskLevel: 'Risk Level'
      },
      quickActions: {
        title: 'Quick Actions',
        sendMessage: 'Send Message',
        requestPhotos: 'Request Photos',
        sendInstructions: 'Send Instructions',
        callPatient: 'Call Patient'
      },
      actions: {
        title: 'Actions',
        confirm: 'Confirm Appointment',
        reschedule: 'Reschedule',
        handleReschedule: 'Handle Reschedule Request',
        checkIn: 'Check-in Patient',
        startVideo: 'Start Video Consultation',
        cancel: 'Cancel Appointment'
      }
    },
    stats: {
      totalAppointments: 'Total Appointments',
      currentlyActive: 'currently active',
      pending: 'Pending Confirmation',
      needsConfirmation: 'Needs confirmation',
      confirmed: 'Confirmed',
      readyToGo: 'Ready to go',
      completed: 'Completed',
      successfullyFinished: 'Successfully finished',
      teledentistry: 'Teledentistry',
      inClinic: 'in clinic',
      highRisk: 'High Risk',
      requiresAttention: 'Requires attention',
      depositRequired: 'Deposit Required',
      paymentPending: 'Payment pending',
      performanceMetrics: 'Performance Metrics',
      completionRate: 'Completion Rate',
      confirmationRate: 'Confirmation Rate',
      teledentistryUsage: 'Teledentistry Usage',
      quickActions: 'Quick Actions',
      newAppointment: 'New Appointment',
      scheduleNewConsultation: 'Schedule new consultation',
      bulkCheckIn: 'Bulk Check-in',
      checkInMultiplePatients: 'Check-in multiple patients',
      sendReminders: 'Send Reminders',
      notifyPendingPatients: 'Notify pending patients',
      exportSchedule: 'Export Schedule',
      downloadDailyReport: 'Download daily report'
    },
    daily: {
      header: {
        meta: '{{count}} appointments • Granularity {{minutes}} minutes',
        statusLabel: 'Status:',
        statusOptions: {
          available: 'Available',
          busy: 'Busy',
          dnd: 'Do Not Disturb',
          off: 'Off Duty'
        },
        blockingOn: 'Blocking Mode: ON',
        blockingOff: 'Blocking Mode'
      },
      quickBlock: {
        title: 'Quick Close Hours',
        typeSelected: 'Type: {{type}}',
        typePrompt: 'Select a block type first',
        reset: 'Reset',
        instructions: {
          title: '💡 How to close a slot:',
          step1: '1️⃣ Choose a block type above (e.g., Lunch Break)',
          step2: '2️⃣ Click an empty slot to close it immediately',
          step3: '3️⃣ Or click a slot without selecting a type to open the detail form',
          warning: '⚠️ Only empty slots can be closed.'
        }
      },
      statsBar: {
        confirmed: 'Confirmed',
        pending: 'Pending',
        active: 'Active',
        emergency: 'Emergency',
        tele: 'Teledentistry'
      },
      quickBook: {
        block: {
          title: 'Close Slot',
          subtitle: 'Close the slot for a special requirement',
          typeLabel: 'Block Type',
          typePlaceholder: 'Select a block type...',
          durationLabel: 'Duration',
          notesLabel: 'Notes (Optional)',
          notesPlaceholder: 'Enter notes about closing this slot...'
        },
        booking: {
          title: 'Quick Booking',
          subtitle: 'Create a new appointment for the selected slot'
        },
        form: {
          patientName: {
            label: 'Patient Name',
            placeholder: 'Enter patient name...'
          },
          phone: {
            label: 'Phone Number',
            placeholder: 'e.g., 555-123-4567'
          },
          type: {
            label: 'Service Type',
            placeholder: 'Select a service type...'
          },
          duration: {
            label: 'Duration'
          },
          priority: {
            label: 'Priority'
          },
          channel: {
            label: 'Channel'
          },
          concerns: {
            label: 'Concerns / Notes',
            placeholder: 'Enter patient concern or special notes...'
          }
        },
        common: {
          durationOption: '{{minutes}} minutes'
        },
        actions: {
          close: 'Close modal',
          cancel: 'Cancel',
          block: 'Close Slot',
          book: 'Create Appointment'
        }
      },
      appointmentTypes: {
        consultation: 'Consultation',
        scaling: 'Scaling & Polishing',
        fillingSimple: 'Simple Filling',
        fillingComplex: 'Complex Filling',
        rootCanal: 'Root Canal',
        followUp: 'Follow-up',
        emergency: 'Emergency'
      },
      blockTypes: {
        lunch: 'Lunch Break',
        dnd: 'Do Not Disturb',
        meeting: 'Team Meeting',
        off: 'Day Off',
        maintenance: 'Maintenance'
      },
      priorities: {
        routine: 'Routine',
        urgent: 'Urgent',
        emergency: 'Emergency'
      },
      channels: {
        office: 'In-clinic',
        tele: 'Teledentistry',
        phone: 'Phone Call'
      },
      legend: {
        available: 'Available',
        booked: 'Booked',
        hold: 'Hold',
        closed: 'Closed',
        outsideHours: 'Outside Hours'
      },
      blockingMode: {
        title: 'Blocking Mode Active:',
        description: 'Slots with existing appointments cannot be closed.'
      }
    },
    toast: {
      blockConflictDetail: '{{time}} ({{status}})',
      status: {
        scheduled: 'Scheduled',
        blocked: 'Closed',
        occupied: 'Occupied'
      },
      blockConflictTitle: 'Cannot close slot',
      blockConflictMessage: 'Found {{count}} conflicts in the selected time range',
      blockSuccessTitle: 'Slot closed successfully',
      blockSuccessMessage: '{{start}} - {{end}} ({{duration}} minutes)',
      blockSuccessType: 'Type: {{type}}',
      blockSuccessDuration: 'Duration: {{duration}} minutes',
      slotUnavailableTitle: 'Slot cannot be closed',
      slotUnavailableBooked: 'This slot already has an appointment. Choose another open slot.',
      slotUnavailableBlocked: 'This slot is already closed. Choose another open slot.',
      slotUnavailableOutsideHours: 'The slot is outside clinic hours. Choose a slot during operating hours.',
      blockConflictShortTitle: 'Unable to close slot',
      blockConflictShortMessage: 'Found {{count}} schedule item(s) that overlap with the selected time range',
      blockConflictShortDetail: 'Pick another time or clear the conflicting appointments first',
      appointmentConflictTitle: 'Unable to create appointment',
      appointmentConflictMessage: 'Found {{count}} appointment(s) overlapping with the selected time',
      appointmentConflictDetail: 'Pick another available slot'
    },

    // Inventory & Sterilization
    inventory: {
      title: 'Inventory & Sterilization',
      subtitle: 'Manage stock, purchasing, and equipment sterilization',
      tabs: {
        stock: 'Stock Items',
        purchase: 'Purchase Requests',
        receipts: 'Receipts',
        usage: 'Usage',
        equipment: 'Sterilization & Equipment'
      },

      // Purchase Requests
      purchase: {
        title: 'Purchase Requests List',
        newRequest: 'New Request',
        searchPlaceholder: 'Search requests...',
        allStatus: 'All Status',
        stats: {
          pending: 'Pending Approval',
          approved: 'Approved',
          ordered: 'Ordered',
          totalValue: 'Total Value'
        },
        status: {
          pending: 'Pending Approval',
          approved: 'Approved',
          rejected: 'Rejected',
          ordered: 'Ordered'
        },
        priority: {
          high: 'High',
          medium: 'Medium',
          low: 'Low'
        },
        table: {
          requestNumber: 'Request No.',
          requestedBy: 'Requested By',
          items: 'Items',
          estimatedCost: 'Est. Cost',
          priority: 'Priority',
          status: 'Status',
          actions: 'Actions'
        }
      },

      // Receipts
      receipts: {
        title: 'Goods Receipt List',
        newReceipt: 'Receive Goods',
        searchPlaceholder: 'Search receipts...',
        allStatus: 'All Status',
        stats: {
          pending: 'Pending Verification',
          verified: 'Verified',
          partial: 'Partial Receipt',
          thisMonth: 'This Month'
        },
        status: {
          pending: 'Pending Verification',
          verified: 'Verified',
          partial: 'Partial',
          rejected: 'Rejected'
        },
        table: {
          receiptNumber: 'Receipt No.',
          poNumber: 'PO No.',
          supplier: 'Supplier',
          receivedBy: 'Received By',
          items: 'Items',
          status: 'Status',
          actions: 'Actions'
        }
      },

      // Usage
      usage: {
        title: 'Usage History',
        recordUsage: 'Record Usage',
        searchPlaceholder: 'Search usage...',
        allTreatments: 'All Treatments',
        topUsed: 'Top Used Items',
        stats: {
          today: 'Today\'s Usage',
          thisWeek: 'This Week',
          thisMonth: 'This Month',
          totalCost: 'Total Cost'
        },
        table: {
          date: 'Date',
          treatment: 'Treatment',
          patient: 'Patient',
          items: 'Items',
          cost: 'Cost',
          actions: 'Actions'
        }
      },

      // Equipment & Sterilization
      equipment: {
        tabs: {
          sterilization: 'Sterilization',
          equipment: 'Equipment'
        },
        sterilization: {
          title: 'Sterilization History',
          newCycle: 'Start Sterilization',
          searchPlaceholder: 'Search batch...',
          allStatus: 'All Status',
          stats: {
            completed: 'Completed Today',
            inProgress: 'In Progress',
            failed: 'Failed',
            thisWeek: 'This Week'
          },
          table: {
            batch: 'Batch',
            equipment: 'Equipment',
            cycle: 'Cycle',
            operator: 'Operator',
            items: 'Items',
            status: 'Status',
            actions: 'Actions'
          }
        },
        list: {
          title: 'Equipment List',
          addEquipment: 'Add Equipment',
          searchPlaceholder: 'Search equipment...',
          allTypes: 'All Types',
          stats: {
            operational: 'Operational',
            inUse: 'In Use',
            maintenance: 'Maintenance',
            total: 'Total Equipment'
          },
          table: {
            equipment: 'Equipment',
            type: 'Type',
            location: 'Location',
            condition: 'Condition',
            maintenance: 'Maintenance',
            status: 'Status',
            actions: 'Actions'
          }
        }
      }
    },

    // Billing & Insurance
    billing: {
      title: 'Billing & Insurance',
      subtitle: 'Track invoices, payments, claims, and promotional packages',
      tabs: {
        invoices: 'Invoices',
        payments: 'Payments',
        claims: 'Insurance Claims',
        promos: 'Promos & Packages'
      },

      payments: {
        title: 'Payment Activity',
        recordPayment: 'Record Payment',
        searchPlaceholder: 'Search payments...',
        allMethods: 'All Methods',
        stats: {
          total: 'Total Received',
          completed: 'Completed',
          pending: 'Pending Confirmation',
          today: 'Today'
        },
        methods: {
          cash: 'Cash',
          transfer: 'Bank Transfer',
          qris: 'QRIS',
          debit: 'Debit Card',
          credit: 'Credit Card'
        },
        status: {
          completed: 'Completed',
          pending: 'Pending',
          failed: 'Failed',
          refunded: 'Refunded'
        },
        table: {
          paymentId: 'Payment ID',
          invoice: 'Invoice',
          patient: 'Patient',
          amount: 'Amount',
          method: 'Method',
          receivedBy: 'Received By',
          status: 'Status',
          actions: 'Actions'
        }
      },

      claims: {
        title: 'Insurance Claims',
        submitClaim: 'Submit Claim',
        searchPlaceholder: 'Search claims...',
        allInsurance: 'All Insurance',
        allStatus: 'All Status',
        stats: {
          totalClaimed: 'Total Claimed',
          totalApproved: 'Total Approved',
          approved: 'Approved Claims',
          pending: 'Pending Review'
        },
        status: {
          pending: 'Pending',
          processing: 'Processing',
          approved: 'Approved',
          partial: 'Partially Approved',
          rejected: 'Rejected'
        },
        table: {
          claimNumber: 'Claim No.',
          patient: 'Patient',
          treatment: 'Treatment',
          insurance: 'Insurance',
          claimAmount: 'Claim Amount',
          approvedAmount: 'Approved Amount',
          status: 'Status',
          actions: 'Actions'
        }
      },

      promos: {
        title: 'Promos & Packages',
        searchPromos: 'Search promos...',
        searchPackages: 'Search packages...',
        createPromo: 'Create Promo',
        createPackage: 'Create Package',
        allStatus: 'All Status',
        tabs: {
          promos: 'Promos',
          packages: 'Packages'
        },
        stats: {
          activePromos: 'Active Promos',
          totalUsage: 'Total Usage',
          activePackages: 'Active Packages',
          packagesSold: 'Packages Sold'
        },
        status: {
          active: 'Active',
          expiring: 'Expiring Soon',
          expired: 'Expired',
          inactive: 'Inactive'
        },
        type: {
          percentage: 'Percentage',
          fixed: 'Fixed Amount'
        },
        promosList: 'Promos List',
        table: {
          name: 'Name',
          code: 'Code',
          type: 'Type',
          value: 'Value',
          validity: 'Validity',
          usage: 'Usage',
          status: 'Status',
          actions: 'Actions'
        },
        package: {
          sold: 'Sold',
          validity: 'Validity',
          includes: 'Includes',
          edit: 'Edit Package'
        }
      }
    }
  }
};
