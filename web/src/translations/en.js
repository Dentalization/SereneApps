export default {
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
    
    // Profile settings
    profile: {
      title: 'Profile Settings',
      subtitle: 'Manage your admin account settings',
      name: 'Full Name',
      email: 'Email Address',
      phone: 'Phone Number',
      bio: 'Bio',
      avatar: 'Profile Picture',
      avatarHint: 'Click to upload new profile picture',
      currentPassword: 'Current Password',
      newPassword: 'New Password',
      confirmPassword: 'Confirm New Password',
      personalInfo: 'Personal Information',
      security: 'Security Settings',
      notifications: 'Notification Preferences',
      save: 'Save Changes',
      cancel: 'Cancel',
      saving: 'Saving...',
      uploadingAvatar: 'Uploading...',
      success: 'Profile updated successfully!',
      uploadSuccess: 'Avatar uploaded successfully!',
      error: 'Failed to update profile. Please try again.',
      uploadError: 'Failed to upload avatar. Please try again.',
      fileSizeError: 'File size must be less than 5MB',
      fileTypeError: 'Please select an image file',
      passwordMismatch: 'Passwords do not match',
      passwordTooShort: 'Password must be at least 6 characters',
      personalInfoDesc: 'Update your personal details and contact information',
      securityDesc: 'Change your password to keep your account secure',
      passwordHint: 'Leave password fields empty if you don\'t want to change your password',
      namePlaceholder: 'Enter your full name',
      emailPlaceholder: 'Enter your email',
      phonePlaceholder: 'Enter your phone number',
      bioPlaceholder: 'Tell us about yourself...',
      currentPasswordPlaceholder: 'Enter current password',
      newPasswordPlaceholder: 'Enter new password',
      confirmPasswordPlaceholder: 'Confirm new password',
      defaultName: 'Admin User',
      defaultEmail: 'admin@sereneai.com'
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
    }
  },
  clinic: {
    sidebar: {
      dashboard: 'Dashboard',
      schedule: 'Schedule & Queue',
      teledentistry: 'Teledentistry',
      patients: 'Patients & Records',
      billing: 'Billing & Insurance',
      inventory: 'Inventory & Sterilization',
      reports: 'Reports & KPI',
      staff: 'Staff Management',
      branches: 'Branch Management',
      settings: 'Settings',
      descriptions: {
        dashboard: 'Summary & Quick Actions',
        schedule: 'Schedule & Queue Management',
        teledentistry: 'Live sessions & summaries',
        patients: 'Registry & Medical Records',
        billing: 'Invoice & Insurance Claims',
        inventory: 'Stock & Equipment Management',
        reports: 'Analytics & Performance',
        staff: 'Staff Management & Roles',
        branches: 'Multi-Branch Operations & Revenue',
        settings: 'Configuration & Admin'
      }
    },
    staff: {
      badge: 'Clinic Staff',
      title: 'Staff Management',
      subtitle: 'Manage your clinic team, roles, and permissions in one place',
      totalStaff: 'total staff',
      loading: 'Loading staff data...',
      actions: {
        addStaff: 'Add Staff',
        addDentist: 'Add Dentist',
        invite: 'Invite Staff',
        refresh: 'Refresh',
        retry: 'Try again',
        closeNotification: 'Close notification'
      },
      summary: {
        total: 'Total Staff',
        active: 'Active Staff',
        efficiency: 'Efficiency Rate',
        utilization: 'Utilization Rate',
        satisfaction: 'Satisfaction Score',
        revenue_per_staff: 'Revenue per Staff',
        capacity: 'Capacity Usage',
        productivity: 'Avg Tasks/Day',
        attendance: 'Attendance Rate',
        performance: 'Performance Score',
        lastActivity: 'Active Today'
      },
      searchPlaceholder: 'Search by name, email, position, or role...',
      filters: {
        role: {
          label: 'Role',
          all: 'All Roles'
        },
        status: {
          label: 'Status',
          all: 'All Status',
          active: 'Active',
          inactive: 'Inactive',
          invited: 'Invited'
        }
      },
      tabs: {
        list: 'Staff List',
        stats: 'Statistics'
      },
      stats: {
        total: 'Total Staff',
        activeToday: 'Active Today',
        departments: 'Departments',
        roleTypes: 'Role Types',
        newThisMonth: 'New This Month'
      },
      directory: {
        headers: {
          staff: 'Staff',
          contact: 'Contact',
          role: 'Role',
          branch: 'Branch',
          status: 'Status',
          actions: 'Actions'
        },
        empty: {
          title: 'No staff members yet',
          description: 'Invite your first team member to collaborate in the clinic portal.'
        },
        actions: {
          view: 'View Profile',
          edit: 'Edit Role',
          changeBranch: 'Change Branch',
          remove: 'Remove'
        }
      },
      statusBadge: {
        active: 'Active',
        inactive: 'Inactive',
        invited: 'Invited'
      },
      roleLabels: {
        owner: 'Owner',
        manager: 'Manager',
        front_office: 'Front Office',
        nurse: 'Nurse',
        cashier: 'Cashier',
        admin: 'Admin',
        dentist: 'Dentist',
        staff: 'Staff'
      },
      roles: {
        title: 'Role Overview',
        description: 'Roles define the level of access each team member has inside the clinic portal.',
        details: {
          owner: 'Full access to every clinic module, billing, and security settings.',
          manager: 'Manage operations, schedules, billing, and team assignments.',
          front_office: 'Handle appointments, patient check-ins, and communication.',
          nurse: 'Assist dentists during procedures, manage inventory and patient records.',
          cashier: 'Process payments, manage invoices, and handle financial reporting.'
        }
      },
      errors: {
        title: 'Unable to load staff',
        partialTitle: 'Some data might be out of date. Refresh to retry.',
        loadFailed: 'Failed to load staff data.',
        profileUpdateFailed: 'Failed to update staff profile.',
        roleUpdateFailed: 'Failed to update staff role.',
        removeFailed: 'Failed to remove staff member.',
        branchChangeFailed: 'Failed to change staff branch assignment.'
      },
      notifications: {
        inviteSuccess: 'Invitation sent to {{name}} successfully.',
        updateSuccess: "Updated role for {{name}}.",
        removeSuccess: '{{name}} has been removed from the clinic staff.',
        profileUpdateSuccess: 'Profile for {{name}} updated successfully.',
        profileUpdateLog: 'Profile updated for {{name}} • {{time}}',
        roleUpdateLog: 'Role updated to {{role}} for {{name}} • {{time}}',
        branchChanged: 'Staff member assigned to {{branchName}} successfully.',
        devFallback: 'Showing sample staff data. Start the clinic API to load live data.'
      },
      modals: {
        common: {
          close: 'Close'
        },
        invite: {
          badge: 'Invite Staff',
          title: 'Send Staff Invitation',
          description: 'Invite a new staff member to join your clinic workspace. They will receive an email with next steps.',
          fields: {
            name: 'Full Name',
            email: 'Email Address',
            password: 'Password',
            role: 'Assign Role',
            position: 'Position (optional)',
            department: 'Department (optional)',
            branch: 'Assign Branch'
          },
          placeholders: {
            name: 'e.g. Dr. Sarah Lestari',
            email: 'name@yourclinic.com',
            password: 'Enter temporary password',
            position: 'Clinic position (optional)',
            department: 'Department or unit (optional)',
            branch: 'Select branch location'
          },
          hints: {
            password: 'Minimum 6 characters. Staff can change this password after first login.',
            branch: 'Staff will be assigned to the selected branch location'
          },
          actions: {
            submit: 'Send Invitation',
            sending: 'Sending...',
            cancel: 'Cancel'
          }
        },
        edit: {
          badge: 'Update Role',
          title: 'Adjust access level',
          subtitle: 'Choose a new role or activation status for {{name}}.',
          currentAssignment: 'Current Assignment',
          fields: {
            role: 'Role',
            status: 'Status'
          },
          helperRole: 'Select the access level that matches this team member\'s responsibilities.',
          helperStatus: 'Status controls whether the team member can sign in to the clinic portal.',
          actions: {
            submit: 'Save Changes',
            saving: 'Saving...',
            cancel: 'Cancel',
            close: 'Close'
          }
        },
        remove: {
          badge: 'Remove Staff',
          title: 'Remove this staff member?',
          description: 'Removing {{name}} ({{email}}) will revoke their access to all clinic modules immediately.',
          warningTitle: 'This action cannot be undone',
          warningBody: 'Historical records remain intact, but the staff member will no longer appear in your active staff list.',
          actions: {
            confirm: 'Remove Staff',
            deleting: 'Removing...',
            cancel: 'Cancel',
            close: 'Close'
          }
        },
        changeBranch: {
          title: 'Change Branch Assignment',
          subtitle: 'Move staff member to a different branch',
          currentBranch: 'Current Branch',
          newBranch: 'New Branch Assignment',
          selectBranch: 'Select a branch...',
          mainBranch: 'Main',
          unassigned: 'Unassigned',
          noBranches: 'No branches available',
          willMoveTo: 'Will move to',
          cancel: 'Cancel',
          update: 'Update Branch',
          updating: 'Updating...'
        },
        addDentist: {
          title: 'Add New Dentist',
          subtitle: 'Register a new dentist with professional credentials'
        }
      },
      profile: {
        badge: 'Staff Profile',
        permissions: 'Module Permissions',
        actions: {
          save: 'Save Changes',
          saving: 'Saving...',
          cancel: 'Cancel',
          close: 'Close'
        },
        placeholders: {
          phone: 'Phone number (optional)',
          position: 'Position (optional)',
          department: 'Department (optional)',
          password: 'Password (min 6 characters)'
        },
        fields: {
          name: 'Full Name',
          email: 'Email',
          phone: 'Phone',
          role: 'Role', 
          status: 'Status',
          position: 'Position',
          department: 'Department',
          joinDate: 'Joined Clinic',
          lastLogin: 'Last Login'
        },
        defaults: {
          missing: 'Not provided',
          unknown: 'Unknown',
          never: 'Never logged in'
        }
      }
    },
    branches: {
      badge: 'Branch Management',
      title: 'Branch Management',
      subtitle: 'Manage clinic branches, monitor performance, and analyze revenue',
      totalBranches: 'total branches',
      loading: 'Loading branches...',
      tabs: {
        overview: 'Overview',
        directory: 'Directory',
        revenue: 'Revenue'
      },
      actions: {
        addBranch: 'Add Branch',
        retry: 'Try Again'
      },
      errors: {
        title: 'Error Loading Branches',
        loadFailed: 'Failed to load branches',
        addFailed: 'Failed to add branch',
        updateFailed: 'Failed to update branch',
        deleteFailed: 'Failed to delete branch'
      },
      notifications: {
        branchAdded: 'Branch "{name}" has been added successfully',
        branchUpdated: 'Branch "{name}" has been updated successfully',
        branchDeleted: 'Branch has been deleted successfully'
      }
    },
    schedule: {
      title: 'Clinic Schedule',
      subtitle: 'Manage all doctors schedules and monitor clinic activities',
      overview: 'Overview',
      calendar: 'Calendar',
      statistics: 'Statistics',
      today: 'Today',
      week: 'Week',
      month: 'Month',
      daily: 'Daily',
      allDoctors: 'All Doctors',
      createAppointment: 'Create Appointment',
      appointmentsToday: 'appointments today',
      totalAppointments: 'Total Appointments',
      confirmed: 'Confirmed',
      pending: 'Pending',
      inProgress: 'In Progress',
      completed: 'Completed',
      cancelled: 'Cancelled',
      patientsInClinic: 'Patients in clinic',
      doctorWorkload: 'Doctor Workload',
      appointmentStatus: 'Appointment Status',
      todayProgress: 'Today Progress',
      busiestTimeAnalysis: 'Busiest Time Analysis',
      busiestHour: 'Busiest Hour',
      averagePerHour: 'Average per Hour',
      activeHours: 'Active Hours',
      hourlyDistribution: 'Hourly Distribution',
      appointments: 'appointments',
      timeDistribution: 'Time distribution',
      patientsPresent: 'Patients present',
      calendarThisWeek: 'Calendar This Week',
      viewDetails: 'View Details',
      deepStatistics: 'Deep Statistics',
      deepStatisticsMessage: 'Advanced statistics features will be available soon',
      loadingSchedule: 'Loading clinic schedule...',
      noAppointments: 'No appointments',
      noAppointmentsMessage: 'No appointments scheduled for this period',
      doctorFilter: 'Doctor Filter',
      selectAll: 'Select All',
      clear: 'Clear',
      advancedAnalytics: 'Advanced Analytics',
      advancedAnalyticsSubtitle: 'Predictive insights to optimize your clinic',
      predictiveAnalytics: 'Predictive Analytics',
      aiDrivenPredictions: 'AI-driven predictions',
      nextWeekDemand: 'Next week demand',
      peakHoursPrediction: 'Peak hours prediction',
      cancellationRisk: 'Cancellation risk',
      patientFlowOptimization: 'Patient Flow Optimization',
      streamlineOperations: 'Streamline operations',
      averageWaitTime: 'Average wait time',
      throughputEfficiency: 'Throughput efficiency',
      bottleneckIdentified: 'Bottleneck identified',
      xrayRoom: 'X-Ray Room',
      revenueForecasting: 'Revenue Forecasting',
      financialPredictions: 'Financial predictions',
      monthlyProjection: 'Monthly projection',
      growthRate: 'Growth rate',
      optimalPricing: 'Optimal pricing',
      implemented: 'Implemented',
      actionableInsights: 'Actionable Insights',
      recommendation1: 'Add 2 more slots at 10:00-11:00',
      recommendation1Desc: 'High demand period with 23% increase expected',
      recommendation2: 'Optimize X-Ray scheduling',
      recommendation2Desc: 'Reduce bottleneck by 15 minutes average',
      doctors: {
        drSarahLestari: 'Dr. Sarah Lestari',
        drAhmadFauzi: 'Dr. Ahmad Fauzi',
        drMayaSari: 'Dr. Maya Sari',
        drRinoPratama: 'Dr. Rino Pratama'
      },
      specializations: {
        generalDentist: 'General Dentist',
        orthodontist: 'Orthodontist',
        endodontist: 'Endodontist',
        oralSurgeon: 'Oral Surgeon'
      },
      appointmentTypes: {
        generalConsultation: 'General Consultation',
        scalingPolishing: 'Scaling & Polishing'
      },
      patients: {
        ahmadSutrisno: 'Ahmad Sutrisno',
        budiSantoso: 'Budi Santoso'
      },
      locations: {
        room1: 'Room 1',
        room2: 'Room 2'
      },
      reasons: {
        toothacheUpperRight: 'Upper right toothache',
        routineScaling: 'Routine six-month scaling'
      },
      appointment: {
        details: 'Appointment Details',
        patientInfo: 'Patient Information',
        appointmentDetails: 'Appointment Details',
        riskAssessment: 'Risk Assessment',
        riskLevel: 'Risk Level',
        high: 'High',
        medium: 'Medium',
        low: 'Low',
        teledentistry: 'Teledentistry',
        videoConsultation: 'Video Consultation',
        patientWillJoin: 'Patient will join consultation via video call',
        openVideoRoom: 'Open Video Room',
        depositRequired: 'Deposit Required',
        patientNeedsDeposit: 'Patient needs to pay deposit before treatment',
        notes: 'Notes',
        confirm: 'Confirm Appointment',
        cancel: 'Cancel',
        checkin: 'Check-in Patient',
        reschedule: 'Reschedule',
        start: 'Start Treatment',
        noShow: 'Mark No Show',
        complete: 'Complete Treatment',
        edit: 'Edit',
        viewPatient: 'Patient',
        status: {
          pending: 'Pending Confirmation',
          confirmed: 'Confirmed',
          checkin: 'Check-in',
          inchair: 'Under Treatment',
          completed: 'Completed',
          cancelled: 'Cancelled',
          noshow: 'No Show',
          rescheduleRequested: 'Reschedule Requested'
        }
      },
      stats: {
        totalAppointments: 'Total Appointments',
        todayLabel: 'Today',
        ofTotal: 'of total',
        inProgress: 'In Progress',
        percentCompleted: 'completed',
        doctorWorkload: 'Doctor Workload',
        appointments: 'appointments',
        noDoctor: 'No doctor data',
        appointmentStatus: 'Appointment Status',
        todayProgress: 'Today Progress',
        vsYesterday: 'vs yesterday',
        performanceIndicators: 'Performance Indicators',
        currentlyActive: 'Currently Active',
        notConfirmed: 'Not Confirmed',
        trendsAndPredictions: 'Trends & Predictions',
        peakHoursPrediction: 'Peak Hours Prediction',
        basedOnHistoricalPatterns: 'Based on historical patterns',
        optimalCapacity: 'Optimal Capacity',
        recommendedUtilization: 'Recommended utilization',
        avgWaitTime: 'Average Wait Time',
        todayEstimate: 'Today estimate',
        revenueImpact: 'Revenue Impact',
        vsLastWeek: 'vs last week',
        optimizationRecommendations: 'Optimization Recommendations',
        optimizeHour1012: 'Optimize 10:00-12:00 slots',
        addSlotsInBusiestHours: 'Add slots in busiest hours to reduce waiting time',
        distributeDoctors: 'Distribute Doctors',
        balanceWorkloadForOptimalEfficiency: 'Balance workload among doctors for optimal efficiency',
        followupReminder: 'Follow-up Reminder',
        activateAutoReminders: 'Activate auto reminders to reduce no-show rate',
        efficiencyRate: 'Efficiency Rate',
        completedVsTotal: 'Completed vs Total',
        target: 'Target',
        attendanceRate: 'Attendance Rate',
        nonCancelledAppointments: 'Non-cancelled appointments',
        timeUtilization: 'Time Utilization',
        activeHoursUtilization: 'Active hours utilization',
        operationalHours: 'operational hours'
      },
      daily: {
        headerTitle: 'Daily Schedule',
        scheduledLabel: '{{count}} appointments scheduled',
        appointmentsForDoctor: '{{count}} appointments',
        appointmentsTodayCount: '{{count}} appointments today',
        activeDoctors: '{{count}} active doctors',
        viewTimeline: 'Timeline',
        viewGrid: 'Grid',
        unknownDoctor: 'Unknown Doctor',
        noAppointmentsToday: 'No appointments today',
        defaultSpecialization: 'Dentist'
      },
      multi: {
        selectedDoctors: '{{count}} Doctors',
        dayNamesShort: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        moreAppointments: '+{{count}} more'
      },
      detail: {
        nameUnavailable: 'Name unavailable',
        contactUnavailable: 'Contact unavailable',
        ageLabel: 'Age: {{age}} {{unit}}',
        years: 'years',
        providerUnavailable: 'Provider unavailable',
        typeUnavailable: 'Type unavailable',
        complaint: 'Chief Complaint',
        duration: '{{minutes}} minutes',
        channelClinic: 'In-clinic',
        channelTele: 'Teledentistry'
      }
    },
    dashboard: {
      badge: 'Clinic Overview',
      title: 'Clinic Dashboard',
      subtitle: "Overview of today's clinic activities and performance",
      quickActions: 'Quick Actions',
      todaySummary: "Today's Summary",
      recentActivities: 'Recent Activities',
      upcomingAppointments: 'Upcoming Appointments',
      newAppointment: '+ New Appointment',
      checkin: 'Check-in',
      createInvoice: 'Create Invoice',
      receivePayment: 'Receive Payment',
      teleconsult: 'Teleconsultation',
      appointmentsToday: "Today's Appointments",
      roomOccupancy: 'Room Occupancy',
      noShow: 'No-Show',
      dailyRevenue: 'Daily Revenue',
      stockAlerts: 'Stock Alerts',
      teamTasks: 'Team Tasks'
    },
    patients: {
      title: 'Patients & Medical Records',
      subtitle: 'Manage patient data, medical history, and related documents',
      registry: 'Patient Registry',
      history: 'Visit History',
      documents: 'Documents & Consent',
      imaging: 'Imaging & X-Ray',
      aiInbox: 'CDSS Inbox'
    },
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
    },
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
    reports: {
      title: 'Reports & KPI',
      subtitle: 'Analytics, performance, and business intelligence',
      operational: 'Operational',
      financial: 'Financial',
      compliance: 'Compliance',
      marketing: 'Marketing'
    },
    clinic: {
      staff: {
        searchPlaceholder: 'Search by name, email, position, or role...',
        filters: {
          role: {
            label: 'Role',
            all: 'All Roles'
          },
          status: {
            label: 'Status',
            all: 'All Status',
            active: 'Active',
            inactive: 'Inactive',
            invited: 'Invited'
          }
        },
        directory: {
          headers: {
            staff: 'Staff',
            contact: 'Contact',
            role: 'Role',
            status: 'Status',
            actions: 'Actions'
          },
          actions: {
            view: 'View Profile',
            edit: 'Edit Role',
            remove: 'Remove'
          },
          empty: {
            title: 'No staff members found',
            description: 'Start by inviting your first staff member'
          }
        },
        actions: {
          addStaff: 'Add Staff'
        },
        errors: {
          loadFailed: 'Failed to load staff data',
          profileUpdateFailed: 'Failed to update profile'
        },
        totalStaff: 'Total Staff',
        summary: {
          total: 'Total Staff',
          active: 'Active Staff',
          efficiency: 'Efficiency',
          utilization: 'Utilization',
          satisfaction: 'Satisfaction',
          revenue_per_staff: 'Revenue per Staff',
          capacity: 'Capacity',
          productivity: 'Productivity',
          attendance: 'Attendance',
          performance: 'Performance',
          lastActivity: 'Last Activity'
        }
      },
    },
    settings: {
      title: 'Settings',
      subtitle: 'Configure clinic, services, and system',
      badge: 'System Settings',
      profile: 'My Profile',
      clinic: 'Clinic Profile',
      schedule: 'Operating Hours',
      services: 'Services & Rates',
      integrations: 'Integrations',
      users: 'Users & Roles',
      templates: 'Document Templates',
      audit: 'Audit & Data',
      readOnly: 'Read Only',
      readOnlyIntegrations: 'You can only view integration settings',
      saveAll: 'Save All',
      accessibleSections: 'accessible sections',
      roleAccess: 'Role-based Access',
      roleAccessDesc: 'Your role determines which settings you can access and modify. Contact your administrator for additional permissions.',
      profileSaveSuccess: 'Profile updated successfully!',
      profileSaveError: 'Failed to update profile',
      passwordChangeSuccess: 'Password changed successfully!',
      passwordChangeError: 'Failed to change password',
      avatarUploadSuccess: 'Avatar uploaded successfully!',
      avatarUploadError: 'Failed to upload avatar',
      clinicSaveSuccess: 'Clinic information updated successfully!',
      clinicSaveError: 'Failed to update clinic information',
      scheduleSaveSuccess: 'Schedule updated successfully!',
      scheduleSaveError: 'Failed to update schedule',
      operatingHours: 'Operating Hours',
      holidays: 'Holidays',
      open: 'Open',
      closed: 'Closed',
      saving: 'Saving...',
      saveSchedule: 'Save Schedule',
      addHoliday: 'Add Holiday',
      noHolidays: 'No holidays configured'
    },
    services: {
      title: 'Services & Pricing',
      addService: 'Add Service',
      noServices: 'No services configured',
      name: 'Service Name',
      namePlaceholder: 'Enter service name',
      category: 'Category',
      price: 'Price (IDR)',
      duration: 'Duration (minutes)',
      description: 'Description',
      descriptionPlaceholder: 'Enter service description',
      active: 'Active',
      inactive: 'Inactive',
      minutes: 'min',
      addSuccess: 'Service added successfully!',
      addError: 'Failed to add service',
      updateSuccess: 'Service updated successfully!',
      updateError: 'Failed to update service',
      deleteSuccess: 'Service deleted successfully!',
      deleteError: 'Failed to delete service',
      deleteConfirm: 'Are you sure you want to delete this service?',
      toggleError: 'Failed to update service status',
      categories: {
        general: 'General',
        cleaning: 'Cleaning',
        filling: 'Filling',
        extraction: 'Extraction',
        surgery: 'Surgery',
        cosmetic: 'Cosmetic',
        orthodontic: 'Orthodontic',
        other: 'Other'
      }
    },
    integrations: {
      enabled: 'Enabled',
      testConnection: 'Test Connection',
      toggleError: 'Failed to update integration',
      saveSuccess: 'Integration settings saved successfully!',
      saveError: 'Failed to save integration settings',
      testSuccess: 'Connection test successful!',
      testError: 'Connection test failed',
      whatsapp: {
        title: 'WhatsApp Business',
        description: 'Send appointment reminders and notifications',
        businessNumber: 'Business Phone Number',
        accessToken: 'Access Token'
      },
      bpjs: {
        title: 'BPJS Kesehatan',
        description: 'Integrate with BPJS insurance system',
        consId: 'Consumer ID',
        secretKey: 'Secret Key'
      },
      payment: {
        title: 'Payment Gateways',
        serverKey: 'Server Key',
        clientKey: 'Client Key',
        secretKey: 'Secret Key',
        publicKey: 'Public Key',
        production: 'Production Mode',
        midtrans: {
          description: 'Accept payments via Midtrans'
        },
        xendit: {
          description: 'Accept payments via Xendit'
        }
      },
      sms: {
        title: 'SMS Notifications',
        description: 'Send appointment reminders via SMS',
        accountSid: 'Account SID',
        authToken: 'Auth Token'
      }
    },
    users: {
      title: 'User Management',
      inviteUser: 'Invite User',
      name: 'Name',
      namePlaceholder: 'Enter full name',
      email: 'Email',
      emailPlaceholder: 'Enter email address',
      role: 'Role',
      active: 'Active',
      inactive: 'Inactive',
      lastLogin: 'Last login',
      neverLoggedIn: 'Never logged in',
      editPermissions: 'Edit Permissions',
      deactivate: 'Deactivate',
      activate: 'Activate',
      removeUser: 'Remove User',
      removeConfirm: 'Are you sure you want to remove this user from the clinic?',
      inviteSuccess: 'User invitation sent successfully!',
      inviteError: 'Failed to send invitation',
      roleUpdateSuccess: 'User role updated successfully!',
      roleUpdateError: 'Failed to update user role',
      statusUpdateSuccess: 'User status updated successfully!',
      statusUpdateError: 'Failed to update user status',
      removeSuccess: 'User removed successfully!',
      removeError: 'Failed to remove user',
      permissionUpdateError: 'Failed to update permissions',
      sendInvite: 'Send Invite',
      roles: {
        owner: 'Owner',
        ownerDesc: 'Full access to all features',
        manager: 'Manager',
        managerDesc: 'Manage staff and clinic operations',
        admin: 'Admin',
        adminDesc: 'Administrative access',
        dentist: 'Dentist',
        dentistDesc: 'Medical professional access',
        nurse: 'Nurse',
        nurseDesc: 'Assistant medical access',
        frontOffice: 'Front Office',
        frontOfficeDesc: 'Reception and scheduling',
        cashier: 'Cashier',
        cashierDesc: 'Payment processing',
        staff: 'Staff',
        staffDesc: 'Basic clinic access'
      },
      permissions: {
        title: 'Permissions',
        patients: 'Patients',
        appointments: 'Appointments',
        staff: 'Staff Management',
        settings: 'Settings',
        read: 'Read',
        write: 'Write',
        delete: 'Delete'
      }
    },
    templates: {
      title: 'Document Templates',
      createTemplate: 'Create Template',
      noTemplates: 'No templates configured',
      name: 'Template Name',
      namePlaceholder: 'Enter template name',
      type: 'Type',
      subject: 'Subject',
      subjectPlaceholder: 'Enter subject line',
      content: 'Content',
      contentPlaceholder: 'Enter template content...',
      active: 'Active',
      inactive: 'Inactive',
      variables: 'Variables',
      availableVariables: 'Available Variables',
      variablesHelp: 'Click on variables to insert them into your template',
      lastModified: 'Modified',
      preview: 'Preview',
      edit: 'Edit',
      delete: 'Delete',
      createSuccess: 'Template created successfully!',
      createError: 'Failed to create template',
      updateSuccess: 'Template updated successfully!',
      updateError: 'Failed to update template',
      deleteSuccess: 'Template deleted successfully!',
      deleteError: 'Failed to delete template',
      deleteConfirm: 'Are you sure you want to delete this template?',
      toggleError: 'Failed to update template status',
      types: {
        notification: 'Notification',
        notificationDesc: 'Email/SMS notifications',
        document: 'Document',
        documentDesc: 'Printable documents',
        report: 'Report',
        reportDesc: 'Medical reports',
        receipt: 'Receipt',
        receiptDesc: 'Payment receipts'
      },
      variables: {
        clinicName: 'Clinic Name',
        patientName: 'Patient Name',
        patientEmail: 'Patient Email',
        patientPhone: 'Patient Phone',
        patientDob: 'Patient Date of Birth',
        appointmentDate: 'Appointment Date',
        appointmentTime: 'Appointment Time',
        doctorName: 'Doctor Name',
        diagnosis: 'Diagnosis',
        treatment: 'Treatment',
        cost: 'Cost',
        totalAmount: 'Total Amount',
        paymentMethod: 'Payment Method',
        todayDate: 'Today Date'
      }
    },
    audit: {
      settingsSaveSuccess: 'Audit settings saved successfully!',
      settingsSaveError: 'Failed to save audit settings',
      exportSuccess: 'Audit logs exported successfully!',
      exportError: 'Failed to export audit logs',
      exportLogs: 'Export Logs',
      exporting: 'Exporting...',
      saving: 'Saving...',
      saveSettings: 'Save Settings',
      searchPlaceholder: 'Search logs...',
      readOnlySettings: 'You can only view audit settings',
      dataRetention: {
        title: 'Data Retention',
        enabled: 'Enable automatic data retention',
        patientRecords: 'Patient Records (years)',
        appointmentLogs: 'Appointment Logs (years)',
        auditLogs: 'Audit Logs (years)',
        backupFrequency: 'Backup Frequency'
      },
      logging: {
        title: 'Activity Logging',
        userActions: 'User Actions',
        systemEvents: 'System Events',
        dataChanges: 'Data Changes',
        loginAttempts: 'Login Attempts',
        paymentTransactions: 'Payment Transactions',
        fileAccess: 'File Access'
      },
      compliance: {
        title: 'Compliance & Security',
        gdprCompliant: 'GDPR Compliant',
        hipaaCompliant: 'HIPAA Compliant',
        dataEncryption: 'Data Encryption',
        accessLogging: 'Access Logging',
        regularBackups: 'Regular Backups',
        staffTraining: 'Staff Training'
      },
      frequency: {
        daily: 'Daily',
        weekly: 'Weekly',
        monthly: 'Monthly'
      },
      logs: {
        title: 'Audit Logs',
        noLogs: 'No audit logs found'
      },
      columns: {
        timestamp: 'Timestamp',
        user: 'User',
        action: 'Action',
        resource: 'Resource',
        status: 'Status',
        details: 'Details'
      },
      periods: {
        '7days': 'Last 7 days',
        '30days': 'Last 30 days',
        '90days': 'Last 90 days',
        '1year': 'Last year'
      }
    }
  },
  // Common
  common: {
    save: 'Save',
    cancel: 'Cancel',
    edit: 'Edit',
    delete: 'Delete',
    add: 'Add',
    search: 'Search',
    filter: 'Filter',
    loading: 'Loading...',
    noData: 'No data',
    confirm: 'Confirm',
    back: 'Back',
    next: 'Next',
    previous: 'Previous',
    close: 'Close',
    view: 'View',
    download: 'Download',
    upload: 'Upload',
    settings: 'Settings',
    refresh: 'Refresh',
    reset: 'Reset',
    clear: 'Clear',
    apply: 'Apply',
    submit: 'Submit',
    send: 'Send',
    sending: 'Sending...',
    saving: 'Saving...',
    creating: 'Creating...',
    create: 'Create',
    update: 'Update',
    yes: 'Yes',
    no: 'No',
    select: 'Select',
    name: 'Name',
    email: 'Email',
    phone: 'Phone',
    address: 'Address',
    date: 'Date',
    time: 'Time',
    status: 'Status',
    type: 'Type',
    notes: 'Notes',
    description: 'Description',
    role: 'Role',
    lightMode: 'Light Mode',
    darkMode: 'Dark Mode',
    viewAll: 'View All',
    viewSchedule: 'View Schedule',
    locale: 'en-US',
    days: {
      monday: 'Monday',
      tuesday: 'Tuesday',
      wednesday: 'Wednesday',
      thursday: 'Thursday',
      friday: 'Friday',
      saturday: 'Saturday',
      sunday: 'Sunday'
    }
  },

  // Sidebar Navigation
  sidebar: {
    dashboard: 'Dashboard',
    schedule: 'Schedule',
    patients: 'Patients',
    teledentistry: 'Teledentistry',
    reports: 'Reports',
    settings: 'Settings',
    aiInsights: 'AI Insights',
    profile: 'Profile',
    logout: 'Logout'
  },

  // Navigation
  navigation: {
    dashboard: 'Dashboard',
    schedule: 'Schedule',
    patients: 'Patients',
    teledentistry: 'Teledentistry',
    reports: 'Reports',
    settings: 'Settings',
    aiInsights: 'AI Insights',
    profile: 'Profile',
    logout: 'Logout'
  },

  // Dashboard/Home
  home: {
    title: 'Practice Dashboard',
    welcome: 'Welcome',
    overview: 'Practice Overview',
    performanceMetrics: 'Performance Metrics',
    realTimeAnalytics: 'Real-time practice analytics & key indicators',
    businessIntelligence: 'Business Intelligence',
    aiDrivenInsights: 'AI-driven insights and financial analytics',
    patientCareManagement: 'Patient Care Management',
    comprehensivePatientCare: 'Comprehensive patient care and relationship management',
    clinicalPracticeManagement: 'Clinical & Practice Management',
    treatmentPlanningInventory: 'Treatment planning & inventory management',
    frequentlyUsedFeatures: 'Frequently used features for practice efficiency',
    customizeLayout: 'Customize Layout',
    todayAppointments: 'Today\'s Appointments',
    upcomingAppointments: 'Upcoming Appointments',
    recentPatients: 'Recent Patients',
    quickActions: 'Quick Actions',
    scheduleAppointment: 'Schedule Appointment',
    addPatient: 'Add Patient',
    viewReports: 'View Reports',
    totalPatients: 'Total Patients',
    appointmentsToday: 'Appointments Today',
    revenue: 'Revenue',
    satisfaction: 'Satisfaction',
    chairStatus: 'Chair Status',
    realTimeChairUtilization: 'Real-time chair utilization',
    utilization: 'Utilization',
    occupied: 'Occupied',
    cleaning: 'Cleaning',
    available: 'Available',
    maintenance: 'Maintenance',
    unknown: 'Unknown',
    claimsOutstanding: 'Claims Outstanding',
    agingSummary: 'Aging summary',
    outstandingClaims: 'outstanding claims',
    avgDays: 'Avg days',
    agingBreakdown: 'Aging Breakdown',
    totalClaims: 'Total claims',
    days: 'days',
    filters: 'Filters',
    today: 'Today',
    sevenDays: '7 Days',
    thirtyDays: '30 Days',
    allProviders: 'All Providers',
    allLocations: 'All Locations',
    productionVsCollections: 'Production vs Collections',
    lastSevenDays: 'Last 7 days',
    production: 'Production',
    collections: 'Collections',
    totalProduction: 'Total Production',
    totalCollections: 'Total Collections',
    aiInsights: 'AI Insights',
    topNoShowRisksToday: 'Top no-show risks today',
  },

  // Schedule
  schedule: {
    title: 'Practice Schedule',
    dailyView: 'Daily',
    weeklyView: 'Weekly',
    monthlyView: 'Monthly',
    today: 'Today',
    tomorrow: 'Tomorrow',
    thisWeek: 'This Week',
    thisMonth: 'This Month',
    allProviders: 'All Providers',
    allLocations: 'All Locations',
    allChannels: 'All Channels',
    allStatus: 'All Status',
    inClinic: 'In-clinic',
    teledentistry: 'Teledentistry',
    pending: 'Pending',
    confirmed: 'Confirmed',
    checkIn: 'Check-in',
    inChair: 'In Chair',
    completed: 'Completed',
    cancelled: 'Cancelled',
    noShow: 'No-show',
    reschedule: 'Reschedule',
    rescheduleRequested: 'Reschedule Requested',
    appointment: 'Appointment',
    patient: 'Patient',
    provider: 'Provider',
    location: 'Location',
    duration: 'Duration',
    blockTime: 'Block Time',
    addBlock: 'Add Block',
    reason: 'Reason',
    lunchBreak: 'Lunch Break',
    meeting: 'Meeting',
    emergency: 'Emergency',
    personalTime: 'Personal Time',
    filters: 'Filters',
    search: 'Search',
    searchPlaceholder: 'Search by patient name, reason...',
    dateRange: 'Date Range',
    customRange: 'Custom Range',
    status: 'Status',
    channel: 'Channel',
    provider: 'Provider',
    location: 'Location',
    priority: 'Priority',
    clearAll: 'Clear All',
    showPending: 'Show Pending',
    teledentistryOnly: 'Teledentistry Only',
    allPriorities: 'All Priorities',
    urgentOnly: 'Urgent Only',
    highRisk: 'High Risk',
    confirm: 'Confirm',
    reschedule: 'Reschedule',
    cancel: 'Cancel',
    startVideo: 'Start Video',
    requestPhotos: 'Request Photos',
    viewDetails: 'View Details',
    urgent: 'Urgent',
    stats: {
      totalAppointments: 'Total Appointments',
      currentlyActive: 'currently active',
      pending: 'Pending',
      needsConfirmation: 'Needs confirmation',
      confirmed: 'Confirmed',
      readyToGo: 'Ready to go',
      completed: 'Completed',
      successfullyFinished: 'Successfully finished',
      teledentistry: 'Teledentistry',
      inClinic: 'in-clinic',
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
      downloadDailyReport: 'Download daily report',
    }
  },

  // Patients
  patients: {
    title: 'Patient Management',
    addPatient: 'Add New Patient',
    selectPatient: 'Select Patient',
    selectPatientDesc: 'Choose a patient from the list to view their detailed information and manage their care.',
    totalPatients: 'Total Patients',
    activePatients: 'Active Patients',
    patientProfile: 'Patient Profile',
    medicalHistory: 'Medical History',
    aiResults: 'AI Results',
    appointments: 'Appointments',
    treatmentPlan: 'Treatment Plan',
    documents: 'Documents',
    communication: 'Communication',
    billing: 'Billing',
    personalInfo: 'Personal Information',
    age: 'Age',
    gender: 'Gender',
    allergies: 'Allergies',
    medications: 'Current Medications',
    bloodType: 'Blood Type',
    emergencyContact: 'Emergency Contact',
    insurance: 'Insurance',
    lastVisit: 'Last Visit',
    nextAppointment: 'Next Appointment',
    priority: 'Priority',
    active: 'Active',
    inactive: 'Inactive',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
    normal: 'Normal'
  },

  // Settings
  settings: {
    title: 'Settings',
    subtitle: 'Configure clinic, services, and system',
    badge: 'System Settings',
    profile: 'My Profile',
    clinic: 'Clinic Profile',
    schedule: 'Operating Hours',
    services: 'Services & Pricing',
    integrations: 'Integrations',
    users: 'Users & Roles',
    templates: 'Document Templates',
    audit: 'Audit & Data',
    readOnly: 'Read Only',
    saveAll: 'Save All',
    accessibleSections: 'accessible sections',
    roleAccess: 'Role-based Access',
    roleAccessDesc: 'Your role determines which settings you can access and modify. Contact administrator for additional permissions.',
    practice: 'Practice Settings',
    preferences: 'Preferences',
    security: 'Security',
    billing: 'AI & Billing',
    profileSettings: 'Profile Settings',
    practiceSettings: 'Practice Settings',
    preferencesSettings: 'Preference Settings',
    securitySettings: 'Security Settings',
    billingSettings: 'AI & Billing Settings',
    
    // Profile
    personalInformation: 'Personal Information',
    professionalInformation: 'Professional Information',
    managePersonalProfessional: 'Manage your personal and professional information',
    uploadImage: 'Upload Image',
    uploading: 'Uploading...',
    name: 'Name',
    email: 'Email',
    phone: 'Phone',
    notFilledYet: 'Not filled yet',
    
    // Security
    changePassword: 'Change Password',
    currentPassword: 'Current Password',
    newPassword: 'New Password',
    confirmPassword: 'Confirm Password',
    enterCurrentPassword: 'Enter your current password',
    enterNewPassword: 'Enter your new password',
    confirmNewPassword: 'Confirm your new password',
    saving: 'Saving...',
    edit: 'Edit',
    clinicInformation: 'Clinic Information',
    enterFullName: 'Enter full name',
    enterEmailAddress: 'Enter email address',
    enterPhoneNumber: 'Enter phone number',
    specialization: 'Specialization',
    experience: 'Experience (years)',
    yearsOfExperience: 'Years of experience',
    years: 'years',
    education: 'Education',
    educationQualification: 'Education qualification',
    clinicName: 'Clinic Name',
    consultationFee: 'Consultation Fee',
    about: 'About',
    notFilledYet: 'Not filled yet',
    
    // Preferences
    themeDisplay: 'Theme & Display',
    theme: 'Theme',
    language: 'Language',
    fontSize: 'Font Size',
    light: 'Light',
    dark: 'Dark',
    system: 'System default',
    english: 'English',
    indonesian: 'Bahasa Indonesia',
    small: 'Small',
    large: 'Large',
    reduceMotion: 'Reduce Motion',
    reduceMotionDesc: 'Helps improve perceived performance',
    
    // Notifications
    notifications: 'Notifications',
    emailNotifications: 'Email Notifications',
    emailNotificationsDesc: 'Receive updates via email',
    pushNotifications: 'Push Notifications',
    pushNotificationsDesc: 'Real-time notifications in your browser',
    appointmentReminders: 'Appointment Reminders',
    appointmentRemindersDesc: 'Stay on top of upcoming visits',
    marketingEmails: 'Marketing Emails',
    marketingEmailsDesc: 'Product updates and best practices',
    systemUpdates: 'System Updates',
    systemUpdatesDesc: 'Important information from the platform',
    reminderSound: 'Reminder Sounds',
    reminderSoundDesc: 'Enable sound for reminders and alerts',
    
    // Regional
    personalPreferences: 'Personal Preferences',
    timezone: 'Timezone',
    dateFormat: 'Date Format',
    timeFormat: 'Time Format',
    currency: 'Currency',
    autoSave: 'Auto Save',
    autoSaveDesc: 'Automatically save changes as you go',
    showTips: 'Show Tips',
    showTipsDesc: 'Display tailored tips and assistance',
    
    // Privacy
    privacy: 'Privacy',
    profileVisibility: 'Profile Visibility',
    public: 'Public',
    limited: 'Limited',
    private: 'Private',
    dataSharing: 'Data Sharing',
    dataSharingDesc: 'Share anonymized usage data to improve the experience',
    analytics: 'Analytics',
    analyticsDesc: 'Enable insights that help us improve',
    
    // Actions
    preferencesSaved: 'Preferences saved successfully!',
    resetPreferencesConfirm: 'Are you sure you want to reset all preferences to default?',
    
    // Security
    changePassword: 'Change Password',
    currentPassword: 'Current Password',
    newPassword: 'New Password',
    confirmPassword: 'Confirm Password',
    twoFactor: 'Two-Factor Authentication',
    loginNotifications: 'Login Notifications',
    sessionTimeout: 'Session Timeout',
    deviceTrust: 'Device Trust',
    loginHistory: 'Login History',
    securityQuestions: 'Security Questions',
    
    // Messages
    preferencesSaved: 'Preferences saved successfully!',
    resetPreferencesConfirm: 'Reset all preference settings to their defaults?',
    profileUpdated: 'Profile updated successfully!',
    securityUpdated: 'Security settings updated successfully!'
  },

  // Teledentistry
  teledentistry: {
    title: 'Teledentistry',
    activeCall: 'Active Call',
    conversations: 'Conversations',
    startCall: 'Start Call',
    endCall: 'End Call',
    mute: 'Mute',
    unmute: 'Unmute',
    camera: 'Camera',
    shareScreen: 'Share Screen',
    chat: 'Chat',
    patientInfo: 'Patient Information',
    callDuration: 'Call Duration',
    callQuality: 'Call Quality',
    dashboard: {
      title: 'Today\'s Session Dashboard',
      subtitle: 'Live, waiting, and upcoming virtual appointments.',
      empty: 'No sessions today',
      formSubmitted: 'Pre-session form submitted',
      status: {
        live: 'Live',
        waiting: 'Waiting',
        upcoming: 'Upcoming',
        completed: 'Completed'
      }
    },
    chatReadiness: {
      tokenResponseMissing: 'The teledentistry session response is incomplete. Please try again.',
      paymentPending: 'Payment is not complete yet. Chat will be available after payment is confirmed.',
      sessionEnded: 'The teledentistry session has ended. Chat history is shown from the local archive.',
      chatNotReady: 'Chat is not available for this appointment yet. Please try again shortly.',
      chatTokenMissing: 'Chat token is not available yet. Please try again or contact admin.',
      conversationNotReady: 'The chat conversation is not ready yet. Please try again shortly.',
      connectFailed: 'Failed to connect chat'
    }
  },

  // Reports
  reports: {
    title: 'Reports & Analytics',
    patientReports: 'Patient Reports',
    financialReports: 'Financial Reports',
    appointmentReports: 'Appointment Reports',
    performanceMetrics: 'Performance Metrics',
    export: 'Export',
    dateRange: 'Date Range',
    generateReport: 'Generate Report'
  },

  // Reports & Statistics
  reports: {
    title: 'Reports & Statistics',
    subtitle: 'Comprehensive analytics and business intelligence for your dental practice',
    dashboard: 'Analytics Dashboard',
    overview: 'Practice Overview',
    
    // Time Periods
    today: 'Today',
    yesterday: 'Yesterday',
    thisWeek: 'This Week',
    lastWeek: 'Last Week',
    thisMonth: 'This Month',
    lastMonth: 'Last Month',
    thisQuarter: 'This Quarter',
    lastQuarter: 'Last Quarter',
    thisYear: 'This Year',
    lastYear: 'Last Year',
    custom: 'Custom Range',
    
    // Categories
    financial: 'Financial Reports',
    operational: 'Operational Reports',
    clinical: 'Clinical Reports',
    patient: 'Patient Analytics',
    performance: 'Performance Metrics',
    comparative: 'Comparative Analysis',
    
    // Financial Metrics
    revenue: 'Revenue',
    revenueAnalysis: 'Revenue Analysis',
    totalRevenue: 'Total Revenue',
    grossRevenue: 'Gross Revenue',
    netRevenue: 'Net Revenue',
    projectedRevenue: 'Projected Revenue',
    revenueGrowth: 'Revenue Growth',
    revenueByService: 'Revenue by Service',
    revenueByProvider: 'Revenue by Provider',
    revenueByLocation: 'Revenue by Location',
    revenueByPaymentMethod: 'Revenue by Payment Method',
    monthlyRevenue: 'Monthly Revenue',
    revenueByTreatment: 'Revenue by Treatment',
    averageTransactionValue: 'Average Transaction Value',
    paymentMethods: 'Payment Methods',
    outstandingPayments: 'Outstanding Payments',
    
    // Operational Metrics
    appointments: 'Appointments',
    appointmentAnalysis: 'Appointment Analysis',
    totalAppointments: 'Total Appointments',
    completedAppointments: 'Completed Appointments',
    cancelledAppointments: 'Cancelled Appointments',
    noShowRate: 'No-Show Rate',
    rescheduleRate: 'Reschedule Rate',
    appointmentDuration: 'Average Duration',
    appointmentEfficiency: 'Appointment Efficiency',
    chairUtilization: 'Chair Utilization',
    providerProductivity: 'Provider Productivity',
    scheduleOptimization: 'Schedule Optimization',
    peakHours: 'Peak Hours',
    appointmentTypes: 'Appointment Types',
    waitTimeDistribution: 'Wait Time Distribution',
    roomUtilization: 'Room Utilization',
    staffEfficiency: 'Staff Efficiency',
    averageWaitTime: 'Average Wait Time',
    dailyCapacity: 'Daily Capacity',
    
    // Clinical Metrics
    treatments: 'Treatments',
    treatmentAnalysis: 'Treatment Analysis',
    treatmentSuccess: 'Treatment Success Rate',
    treatmentTypes: 'Treatment Types',
    treatmentOutcomes: 'Treatment Outcomes',
    successRateByTreatment: 'Success Rate by Treatment',
    diagnosisAccuracy: 'Diagnosis Accuracy',
    accuracyRate: 'Accuracy Rate',
    treatmentDuration: 'Treatment Duration',
    qualityMetrics: 'Quality Metrics',
    painManagement: 'Pain Management',
    followUpCompliance: 'Follow-up Compliance',
    infectionControl: 'Infection Control',
    equipmentEfficiency: 'Equipment Efficiency',
    treatmentTimeline: 'Treatment Timeline',
    complicationRate: 'Complication Rate',
    treatmentCompletion: 'Treatment Completion',
    patientSatisfaction: 'Patient Satisfaction',
    treatmentComplexity: 'Treatment Complexity',
    treatmentDuration: 'Treatment Duration',
    treatmentOutcomes: 'Treatment Outcomes',
    clinicalIndicators: 'Clinical Indicators',
    qualityMetrics: 'Quality Metrics',
    
    // Patient Metrics
    patients: 'Patients',
    patientAnalysis: 'Patient Analysis',
    newPatients: 'New Patients',
    returningPatients: 'Returning Patients',
    patientRetention: 'Patient Retention',
    patientSatisfaction: 'Patient Satisfaction',
    patientDemographics: 'Patient Demographics',
    patientJourney: 'Patient Journey',
    patientLTV: 'Patient Lifetime Value',
    patientAcquisition: 'Patient Acquisition',
    totalPatients: 'Total Patients',
    activePatients: 'Active Patients',
    retentionRate: 'Retention Rate',
    averageAge: 'Average Age',
    ageDistribution: 'Age Distribution',
    visitFrequency: 'Visit Frequency',
    
    // Demographics
    demographics: 'Demographics',
    genderDistribution: 'Gender Distribution',
    male: 'Male',
    female: 'Female',
    ageGroups: 'Age Groups',
    
    // Treatment specifics
    totalTreatments: 'Total Treatments',
    completed: 'Completed',
    ongoing: 'Ongoing',
    successRate: 'Success Rate',
    successful: 'Successful',
    complications: 'Complications',
    referrals: 'Referrals',
    perTreatment: 'per Treatment',
    treatments: 'treatments',
    popularity: 'Popularity',
    outcomes: 'Outcomes',
    treatmentDescription: "Snapshot of treatment volume, outcomes, and timing—at a glance",
    
    // Growth metrics
    growth: 'Growth',
    retention: 'Retention',
    yearlyGrowth: 'Yearly Growth',
    avgMonthlyGrowth: 'Avg Monthly Growth',
    avgNewPatients: 'Avg New Patients',
    avgDuration: 'Avg Duration',
    avgMonthly: 'Avg Monthly',
    
    // Quality metrics
    satisfaction: 'Satisfaction',
    appointmentFrequency: 'Appointment Frequency',
    treatmentCompletion: 'Treatment Completion',
    communication: 'Communication',
    
    // Data updates
    dataUpdated: 'Data Updated',
    lastUpdated: 'Last Updated',
    referralSources: 'Referral Sources',
    retentionAnalysis: 'Retention Analysis',
    retentionByYears: 'Retention by Years',
    churnRisk: 'Churn Risk',
    patientValue: 'Patient Value',
    averageLifetimeValue: 'Average Lifetime Value',
    valueSegments: 'Value Segments',
    outOf5Stars: 'out of 5 stars',
    overallExperience: 'Overall Experience',
    waitTime: 'Wait Time',
    staffFriendliness: 'Staff Friendliness',
    facilityCleanliness: 'Facility Cleanliness',
    treatmentExplanation: 'Treatment Explanation',
    regular6Months: 'Regular (6 months)',
    yearly: 'Yearly',
    asNeeded: 'As needed',
    irregular: 'Irregular',
    wordOfMouth: 'Word of Mouth',
    onlineSearch: 'Online Search',
    socialMedia: 'Social Media',
    insurance: 'Insurance',
    others: 'Others',
    
    // Performance Indicators
    kpi: 'Key Performance Indicators',
    productivity: 'Productivity',
    efficiency: 'Efficiency',
    profitability: 'Profitability',
    growth: 'Growth Rate',
    benchmarks: 'Benchmarks',
    targets: 'Targets',
    achievements: 'Achievements',
    improvements: 'Areas for Improvement',
    
    // Chart Types
    lineChart: 'Line Chart',
    barChart: 'Bar Chart',
    pieChart: 'Pie Chart',
    areaChart: 'Area Chart',
    donutChart: 'Donut Chart',
    heatmap: 'Heat Map',
    trendChart: 'Trend Chart',
    comparisonChart: 'Comparison Chart',
    
    // Data Actions
    export: 'Export',
    print: 'Print',
    share: 'Share',
    download: 'Download',
    refresh: 'Refresh Data',
    filter: 'Filter',
    search: 'Search',
    sort: 'Sort',
    
    // Export Formats
    exportPdf: 'Export as PDF',
    exportExcel: 'Export as Excel',
    exportCsv: 'Export as CSV',
    exportImage: 'Export as Image',
    
    // Filters
    dateRange: 'Date Range',
    provider: 'Provider',
    location: 'Location',
    service: 'Service Type',
    paymentMethod: 'Payment Method',
    patientType: 'Patient Type',
    ageGroup: 'Age Group',
    gender: 'Gender',
    
    // Filter Options
    allTreatments: 'All Treatments',
    allPatients: 'All Patients',
    returningPatients: 'Returning Patients',
    customRange: 'Custom Range',
    startDate: 'Start Date',
    endDate: 'End Date',
    treatmentType: 'Treatment Type',
    revenueRange: 'Revenue Range',
    minRevenue: 'Min Revenue',
    maxRevenue: 'Max Revenue',
    applyFilters: 'Apply Filters',
    reset: 'Reset',
    filters: 'Filters',
    
    // Summary Cards
    totalValue: 'Total Value',
    averageValue: 'Average Value',
    percentageChange: 'Change',
    trend: 'Trend',
    comparison: 'vs Previous Period',
    
    // Insights
    insights: 'Insights',
    recommendations: 'Recommendations',
    alerts: 'Alerts',
    trends: 'Trends',
    anomalies: 'Anomalies',
    opportunities: 'Opportunities',
    
    // Descriptions
    revenueDescription: 'Track your practice revenue across different time periods, services, and providers',
    appointmentDescription: 'Monitor appointment patterns, efficiency, and patient flow metrics',
    clinicalDescription: 'Analyze treatment outcomes, success rates, and clinical performance indicators',
    patientDescription: 'Understand patient behavior, demographics, and satisfaction metrics',
    performanceDescription: 'Comprehensive performance metrics and KPIs for practice optimization',
    
    // Status
    loading: 'Loading analytics...',
    noData: 'No data available for selected period',
    error: 'Error loading report data',
    success: 'Report generated successfully',
    
    // Time Formats
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    yearly: 'Yearly',
    
    // Units
    currency: 'Currency',
    percentage: 'Percentage',
    count: 'Count',
    duration: 'Duration',
    rate: 'Rate'
  },

  // AI Insights
  ai: {
    title: 'AI Clinical Analysis',
    subtitle: 'Advanced dental image analysis powered by Serene',
    analysis: 'Analysis',
    recommendations: 'Recommendations',
    riskAssessment: 'Risk Assessment',
    treatment: 'Treatment',
    confidence: 'Confidence Level',
    findings: 'Findings',
    
    // Chat Interface
    chatTitle: 'AI Assistant',
    welcomeMessage: 'Welcome to AI Clinical Analysis',
    welcomeSubtitle: 'Upload dental images and ask questions to get comprehensive AI-powered analysis and recommendations.',
    inputPlaceholder: 'Ask AI about dental conditions, treatments, or upload an image for analysis...',
    thinking: 'AI is thinking...',
    thinking: 'AI is thinking...',
    
    // Image Upload
    uploadImages: 'Upload Images',
    dragDropText: 'Drag & drop images here or click to browse',
    chooseFiles: 'Choose Files',
    recentImages: 'Recent Images',
    selectedImage: 'Selected',
    imageAnalyzed: 'Image analyzed',
    
    // Quick Actions
    quickActions: 'Quick Actions',
    analyzeImage: 'Analyze This Image',
    identifyConditions: 'Identify Conditions',
    treatmentRecommendations: 'Treatment Recommendations',
    riskAssessmentAction: 'Risk Assessment',
    
    // Analysis Messages
    analyzeImageMessage: 'Please analyze this dental image and provide a comprehensive diagnosis.',
    identifyConditionsMessage: 'Can you identify any dental conditions or abnormalities in this image?',
    treatmentMessage: 'Based on this image, what treatment recommendations would you suggest?',
    riskMessage: 'Please assess the risk level and urgency of any conditions shown in this image.',
    
    // Status
    connected: 'Connected',
    disconnected: 'Disconnected',
    analysisResults: 'Analysis Results',
    
    // Error Messages
    uploadError: 'Failed to upload image',
    analysisError: 'Sorry, I encountered an error. Please try again.',
    connectionError: 'Unable to connect to AI service',
    deepDental: {
      booting: 'Initializing Serene AI...',
      clinicalAssistant: 'Clinical Assistant',
      newAnalysis: 'New Analysis',
      analyzing: 'Analyzing...',
      verifyNotice: 'Serene AI can make mistakes. Verify clinical findings.',
      clearLocalData: 'Clear local clinical data',
      clearLocalDataShort: 'Clear Local',
      empty: {
        title: 'Ready to Analyze',
        subtitle: 'Upload a dental image or describe a case to get AI-powered analysis, clinical findings, and treatment recommendations.',
        pathology: 'Pathology Detection',
        clinical: 'Clinical Analysis',
        evidence: 'Evidence-Based'
      },
      input: {
        placeholder: 'Ask about diagnosis or upload a scan...',
        dropToAnalyze: 'Drop to analyze',
        attachImage: 'Attach dental image',
        removeImage: 'Remove image',
        messageInput: 'Dental analysis message',
        send: 'Send analysis request',
        fileInput: 'Select dental image'
      },
      qualityCoach: {
        title: 'Quality Coach',
        ready: 'Initial quality is sufficient for analysis.'
      },
      sidebar: {
        open: 'Open analysis history',
        close: 'Close history',
        pastAnalyses: 'Past Analyses',
        clinicalHistory: 'Clinical History',
        sessionsAndCases: 'Verified sessions and cases',
        archiveCase: 'Archive case',
        backendSource: 'Backend as the clinical data source',
        openSession: 'Open session',
        deleteSession: 'Delete session',
        noHistory: 'No history',
        emptyDescription: 'Start a new analysis to see your sessions here.',
        secureStorage: 'Secure Storage',
        today: 'Today',
        yesterday: 'Yesterday',
        previous7Days: 'Previous 7 Days',
        older: 'Older'
      }
    }
  },
  patients: {
    title: 'Patient Management',
    tabs: {
      registry: 'Patient Registry',
      appointments: 'Appointments',
      analytics: 'Analytics',
      reports: 'Reports'
    },
    common: {
      gender: {
        male: 'Male',
        female: 'Female'
      },
      labels: {
        visits: 'visits',
        years: '{{count}} years',
        yearsOld: '{{count}} years old'
      }
    },
    registry: {
      title: 'Patient Registry',
      search: 'Search patients...',
      loading: 'Loading patients...',
      empty: {
        title: 'No patients found',
        description: 'Try adjusting your search or filters'
      },
      filters: {
        all: 'All Patients',
        allStatus: 'All Status',
        active: 'Active',
        inactive: 'Inactive',
        vip: 'VIP',
        newPatients: 'New Patients'
      },
      search: {
        placeholder: 'Search patients...'
      },
      table: {
        name: 'Name',
        age: 'Age',
        gender: 'Gender',
        phone: 'Phone',
        patient: 'Patient',
        contact: 'Contact',
        lastVisit: 'Last Visit',
        totalVisits: 'Visits',
        status: 'Status',
        actions: 'Actions',
        noEmail: 'No email',
        visitsBadge: '{{count}} visits'
      },
      status: {
        active: 'Active',
        inactive: 'Inactive',
        vip: 'VIP'
      },
      actions: {
        view: 'View',
        edit: 'Edit',
        schedule: 'Schedule',
        history: 'View History',
        export: 'Export',
        add: 'Add Patient'
      },
      stats: {
        totalPatients: 'Total Patients',
        newThisMonth: 'New This Month',
        activePatients: 'Active Patients',
        vipPatients: 'VIP Patients'
      }
    },
    appointments: {
      title: 'Patient Appointments',
      scheduleNew: 'Schedule New Appointment',
      upcoming: 'Upcoming Appointments',
      past: 'Past Appointments',
      cancelled: 'Cancelled',
      noAppointments: 'No appointments found'
    },
    analytics: {
      filters: 'Analytics Filters',
      period: 'Period',
      year: 'Year',
      month: 'Month',
      periods: {
        all: 'All Time',
        today: 'Today',
        week: 'This Week',
        month: 'This Month',
        year: 'This Year',
        custom: 'Custom Range'
      },
      viewPatients: 'View Patients',
      patientList: 'Filtered Patients',
      modalTitle: 'Filtered Patients',
      patientCard: {
        meta: '{{age}} years • {{gender}} • {{phone}}'
      },
      stats: {
        total: 'Total Patients',
        active: 'Active Patients',
        vip: 'VIP Patients',
        avgAge: 'Average Age'
      },
      charts: {
        ageDistribution: 'Age Distribution',
        genderRatio: 'Gender Distribution',
        monthlyVisits: 'Monthly Visits',
        treatmentTypes: 'Treatment Types',
        datasets: {
          patients: 'Patients',
          visits: 'Visits'
        }
      },
      treatments: {
        cleaning: 'Cleaning',
        filling: 'Filling',
        rootCanal: 'Root Canal',
        extraction: 'Extraction',
        crown: 'Crown',
        whitening: 'Whitening',
        other: 'Other'
      },
      demographics: 'Demographics Breakdown',
      table: {
        ageGroup: 'Age Group',
        male: 'Male',
        female: 'Female',
        total: 'Total',
        percentage: 'Percentage'
      }
    },
    reports: {
      title: 'Patient Reports',
      reportType: 'Report Type',
      generate: 'Generate Report',
      generating: 'Generating...',
      generationSuccess: 'Report generated successfully!',
      types: {
        patientList: 'Patient List',
        visitSummary: 'Visit Summary',
        treatmentReport: 'Treatment Report',
        demographic: 'Demographics'
      },
      filters: {
        dateRange: 'Date Range',
        patientType: 'Patient Type',
        patientTypes: {
          all: 'All Patients',
          active: 'Active Patients',
          inactive: 'Inactive Patients',
          vip: 'VIP Patients'
        },
        treatmentType: 'Treatment Type',
        treatmentTypes: {
          all: 'All Treatments',
          cleaning: 'Cleaning',
          filling: 'Filling',
          rootCanal: 'Root Canal',
          extraction: 'Extraction'
        }
      },
      preview: {
        title: 'Report Preview',
        patientList: {
          title: 'Patient List Preview',
          more: '... and {{count}} more patients'
        },
        visitSummary: {
          title: 'Visit Summary Preview',
          totalVisits: 'Total Visits',
          avgVisits: 'Avg Visits per Patient'
        },
        treatmentReport: {
          title: 'Treatment Report Preview',
          distribution: 'Treatment Distribution'
        },
        demographic: {
          title: 'Demographic Report Preview',
          genderDistribution: 'Gender Distribution',
          averageAge: 'Average Age'
        }
      },
      recent: {
        title: 'Recent Reports'
      }
    },
    details: {
      personalInfo: 'Personal Information',
      medicalHistory: 'Medical History',
      treatmentHistory: 'Treatment History',
      appointments: 'Appointments',
      documents: 'Documents',
      notSpecified: 'Not specified',
      patientId: 'Patient ID: #{{id}}',
      basicInfo: {
        fullName: 'Full Name',
        dateOfBirth: 'Date of Birth',
        gender: 'Gender',
        phone: 'Phone Number',
        email: 'Email',
        address: 'Address',
        emergencyContact: 'Emergency Contact',
        age: 'Age',
        ageValue: '{{count}} years old'
      },
      medical: {
        allergies: 'Allergies',
        conditions: 'Medical Conditions',
        medications: 'Current Medications',
        bloodType: 'Blood Type',
        lastTreatment: 'Last Treatment'
      },
      visitStats: {
        title: 'Visit Statistics',
        totalVisits: 'Total Visits',
        lastVisit: 'Last Visit',
        patientSince: 'Patient Since'
      }
    }
  },
  profile: {
    settings: 'Profile Settings',
    description: 'Manage your account information and preferences',
    changePhoto: 'Change Photo',
    personalInfo: 'Personal Information',
    fullName: 'Full Name',
    email: 'Email Address',
    phoneNumber: 'Phone Number',
    title: 'Professional Title',
    licenseNumber: 'License Number',
    specialization: 'Primary Specialization',
    about: 'About',
    aboutPlaceholder: 'Tell us about yourself...',
    registrationNumber: 'Registration Number',
    yearsOfExperience: 'Years of Experience',
    education: 'Education Qualification',
    consultationFee: 'Consultation Fee',
    clinicName: 'Clinic Name',
    clinicAddress: 'Clinic Address',
    changePassword: 'Change Password',
    currentPassword: 'Current Password',
    newPassword: 'New Password',
    confirmPassword: 'Confirm New Password',
    saveProfile: 'Save Profile',
    saving: 'Saving...',
    changing: 'Changing...',
    updateSuccess: 'Profile updated successfully!',
    updateError: 'Failed to update profile',
    passwordChangeSuccess: 'Password changed successfully!',
    passwordChangeError: 'Failed to change password',
    passwordMismatch: 'New passwords do not match',
    passwordTooShort: 'Password must be at least 6 characters long',
    avatarUploadSuccess: 'Profile picture updated successfully!',
    avatarUploadError: 'Failed to upload profile picture',
    invalidImageType: 'Please select a valid image file',
    imageTooLarge: 'Image size must be less than 5MB'
  },
  
  // Schedule Settings
  schedule: {
    operatingHours: 'Operating Hours',
    open: 'Open',
    closed: 'Closed',
    holidays: 'Holidays',
    addHoliday: 'Add Holiday',
    noHolidays: 'No holidays configured',
    scheduleSaveSuccess: 'Schedule updated successfully!',
    scheduleSaveError: 'Failed to update schedule',
    saveSchedule: 'Save Schedule'
  },

  // Services Settings
  services: {
    title: 'Services & Pricing',
    addService: 'Add Service',
    noServices: 'No services configured',
    name: 'Service Name',
    namePlaceholder: 'Enter service name',
    category: 'Category',
    price: 'Price (IDR)',
    duration: 'Duration (minutes)',
    description: 'Description',
    descriptionPlaceholder: 'Enter service description',
    active: 'Active',
    inactive: 'Inactive',
    minutes: 'min',
    addSuccess: 'Service added successfully!',
    addError: 'Failed to add service',
    updateSuccess: 'Service updated successfully!',
    updateError: 'Failed to update service',
    deleteSuccess: 'Service deleted successfully!',
    deleteError: 'Failed to delete service',
    deleteConfirm: 'Are you sure you want to delete this service?',
    toggleError: 'Failed to update service status',
    categories: {
      general: 'General',
      cleaning: 'Cleaning',
      filling: 'Filling',
      extraction: 'Extraction',
      surgery: 'Surgery',
      cosmetic: 'Cosmetic',
      orthodontic: 'Orthodontic',
      other: 'Other'
    }
  },

  // Integrations Settings
  integrations: {
    enabled: 'Enabled',
    testConnection: 'Test Connection',
    testSuccess: 'Connection test successful!',
    testError: 'Connection test failed',
    saveSuccess: 'Integration settings saved successfully!',
    saveError: 'Failed to save integration settings',
    toggleError: 'Failed to update integration',
    whatsapp: {
      title: 'WhatsApp Business',
      description: 'Send appointment reminders and notifications',
      businessNumber: 'Business Phone Number',
      accessToken: 'Access Token'
    },
    bpjs: {
      title: 'BPJS Kesehatan',
      description: 'Integrate with BPJS insurance system',
      consId: 'Consumer ID',
      secretKey: 'Secret Key'
    },
    payment: {
      title: 'Payment Gateways',
      serverKey: 'Server Key',
      clientKey: 'Client Key',
      secretKey: 'Secret Key',
      publicKey: 'Public Key',
      production: 'Production Mode',
      midtrans: {
        description: 'Accept payments via Midtrans'
      },
      xendit: {
        description: 'Accept payments via Xendit'
      }
    },
    sms: {
      title: 'SMS Notifications',
      description: 'Send appointment reminders via SMS',
      accountSid: 'Account SID',
      authToken: 'Auth Token'
    }
  },

  // Users Settings
  users: {
    title: 'User Management',
    inviteUser: 'Invite User',
    name: 'Name',
    namePlaceholder: 'Enter full name',
    email: 'Email',
    emailPlaceholder: 'Enter email address',
    role: 'Role',
    active: 'Active',
    inactive: 'Inactive',
    lastLogin: 'Last login',
    neverLoggedIn: 'Never logged in',
    editPermissions: 'Edit Permissions',
    deactivate: 'Deactivate',
    activate: 'Activate',
    removeUser: 'Remove User',
    removeConfirm: 'Are you sure you want to remove this user from the clinic?',
    sendInvite: 'Send Invite',
    inviteSuccess: 'User invitation sent successfully!',
    inviteError: 'Failed to send invitation',
    roleUpdateSuccess: 'User role updated successfully!',
    roleUpdateError: 'Failed to update user role',
    statusUpdateSuccess: 'User status updated successfully!',
    statusUpdateError: 'Failed to update user status',
    removeSuccess: 'User removed successfully!',
    removeError: 'Failed to remove user',
    permissionUpdateError: 'Failed to update permissions',
    roles: {
      owner: 'Owner',
      manager: 'Manager',
      admin: 'Admin',
      dentist: 'Dentist',
      nurse: 'Nurse',
      frontOffice: 'Front Office',
      cashier: 'Cashier',
      staff: 'Staff',
      ownerDesc: 'Full access to all features',
      managerDesc: 'Manage staff and clinic operations',
      adminDesc: 'Administrative access',
      dentistDesc: 'Medical professional access',
      nurseDesc: 'Assistant medical access',
      frontOfficeDesc: 'Reception and scheduling',
      cashierDesc: 'Payment processing',
      staffDesc: 'Basic clinic access'
    },
    permissions: {
      title: 'Permissions',
      patients: 'Patients',
      appointments: 'Appointments',
      staff: 'Staff Management',
      settings: 'Settings',
      read: 'Read',
      write: 'Write',
      delete: 'Delete'
    }
  },

  // Templates Settings
  templates: {
    title: 'Document Templates',
    createTemplate: 'Create Template',
    noTemplates: 'No templates configured',
    name: 'Template Name',
    namePlaceholder: 'Enter template name',
    type: 'Type',
    subject: 'Subject',
    subjectPlaceholder: 'Enter subject line',
    content: 'Content',
    contentPlaceholder: 'Enter template content...',
    active: 'Active',
    inactive: 'Inactive',
    preview: 'Preview',
    edit: 'Edit',
    delete: 'Delete',
    variables: 'Variables',
    lastModified: 'Modified',
    availableVariables: 'Available Variables',
    variablesHelp: 'Click on variables to insert them into your template',
    createSuccess: 'Template created successfully!',
    createError: 'Failed to create template',
    updateSuccess: 'Template updated successfully!',
    updateError: 'Failed to update template',
    deleteSuccess: 'Template deleted successfully!',
    deleteError: 'Failed to delete template',
    deleteConfirm: 'Are you sure you want to delete this template?',
    toggleError: 'Failed to update template status',
    types: {
      notification: 'Notification',
      document: 'Document',
      report: 'Report',
      receipt: 'Receipt',
      notificationDesc: 'Email/SMS notifications',
      documentDesc: 'Printable documents',
      reportDesc: 'Medical reports',
      receiptDesc: 'Payment receipts'
    },
    variables: {
      clinicName: 'Clinic Name',
      patientName: 'Patient Name',
      patientEmail: 'Patient Email',
      patientPhone: 'Patient Phone',
      patientDob: 'Patient Date of Birth',
      appointmentDate: 'Appointment Date',
      appointmentTime: 'Appointment Time',
      doctorName: 'Doctor Name',
      diagnosis: 'Diagnosis',
      treatment: 'Treatment',
      cost: 'Cost',
      totalAmount: 'Total Amount',
      paymentMethod: 'Payment Method',
      todayDate: 'Today Date'
    }
  },

  // Audit Settings
  audit: {
    readOnlySettings: 'You can only view audit settings',
    dataRetention: {
      title: 'Data Retention',
      enabled: 'Enable automatic data retention',
      patientRecords: 'Patient Records (years)',
      appointmentLogs: 'Appointment Logs (years)',
      auditLogs: 'Audit Logs (years)',
      backupFrequency: 'Backup Frequency'
    },
    logging: {
      title: 'Activity Logging',
      userActions: 'User Actions',
      systemEvents: 'System Events',
      dataChanges: 'Data Changes',
      loginAttempts: 'Login Attempts',
      paymentTransactions: 'Payment Transactions',
      fileAccess: 'File Access'
    },
    compliance: {
      title: 'Compliance & Security',
      gdprCompliant: 'GDPR Compliant',
      hipaaCompliant: 'HIPAA Compliant',
      dataEncryption: 'Data Encryption',
      accessLogging: 'Access Logging',
      regularBackups: 'Regular Backups',
      staffTraining: 'Staff Training'
    },
    frequency: {
      daily: 'Daily',
      weekly: 'Weekly',
      monthly: 'Monthly'
    },
    logs: {
      title: 'Audit Logs'
    },
    columns: {
      timestamp: 'Timestamp',
      user: 'User',
      action: 'Action',
      resource: 'Resource',
      status: 'Status',
      details: 'Details'
    },
    periods: {
      '7days': 'Last 7 days',
      '30days': 'Last 30 days',
      '90days': 'Last 90 days',
      '1year': 'Last year'
    },
    searchPlaceholder: 'Search logs...',
    noLogs: 'No audit logs found',
    exportLogs: 'Export Logs',
    exporting: 'Exporting...',
    exportSuccess: 'Audit logs exported successfully!',
    exportError: 'Failed to export audit logs',
    settingsSaveSuccess: 'Audit settings saved successfully!',
    settingsSaveError: 'Failed to save audit settings',
    saving: 'Saving...',
    saveSettings: 'Save Settings'
  },

  // General Settings
  settings: {
    badge: 'SETTINGS',
    title: 'Settings',
    subtitle: 'Manage clinic configuration, preferences, and system settings',
    profile: 'My Profile',
    clinic: 'Clinic Profile', 
    schedule: 'Operating Hours',
    services: 'Services & Rates',
    integrations: 'Integrations',
    users: 'Users & Roles',
    templates: 'Document Templates',
    audit: 'Audit & Data',
    readOnly: 'Read Only',
    saveAll: 'Save All Changes',
    accessibleSections: 'accessible sections',
    roleAccess: 'Your Access Level',
    roleAccessDesc: 'Full access to all settings including integrations, audit, and user management',
    avatarUploadSuccess: 'Profile photo updated successfully!',
    readOnlyIntegrations: 'You can only view integration settings',
    clinicSaveSuccess: 'Clinic information updated successfully!',
    clinicSaveError: 'Failed to update clinic information',
    saveClinic: 'Save Clinic Info'
  },

  // Common days
  days: {
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
    sunday: 'Sunday'
  },

  // Common actions
  common: {
    save: 'Save',
    cancel: 'Cancel',
    update: 'Update',
    add: 'Add',
    create: 'Create',
    delete: 'Delete',
    edit: 'Edit',
    saving: 'Saving...',
    sending: 'Sending...',
    creating: 'Creating...',
    search: 'Search...',
    role: 'Role',
    darkMode: 'Dark Mode',
    lightMode: 'Light Mode',
    locale: 'en-US'
  },
  auth: {
    login: {
      emailNotFound: 'Email not found. Please check your email or create a new account.',
      wrongPassword: 'Wrong password. Please check your password.',
      invalidCredentials: 'Invalid email or password. Please try again.',
      missingFields: 'Email and password are required'
    }
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
    }
  }
};
