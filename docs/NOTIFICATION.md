# 🔔 Patient Notifications - Mobile App UI Design

## 📱 Overview

Dokumen ini berisi **semua jenis notifikasi** yang akan diterima patient di mobile app SereneAI, lengkap dengan format, prioritas, icon, warna, dan contoh UI component.

---

## 📋 Table of Contents

1. [Notification Types](#notification-types)
2. [Notification Channels](#notification-channels)
3. [Notification Priority Levels](#notification-priority-levels)
4. [UI Components](#ui-components)
5. [Notification Settings](#notification-settings)
6. [Implementation Examples](#implementation-examples)

---

## 🔔 Notification Types

### **Total: 11 Notification Types**

| # | Type | Category | Priority | Channels |
|---|------|----------|----------|----------|
| 1 | Appointment Confirmed | Appointment | Medium | Push, Email, SMS |
| 2 | Appointment Reminder (24h) | Appointment | High | Push, Email, SMS |
| 3 | Appointment Reminder (1h) | Appointment | Critical | Push, Email, SMS |
| 4 | Appointment Cancelled | Appointment | High | Push, Email, SMS |
| 5 | Appointment Rescheduled | Appointment | High | Push, Email, SMS |
| 6 | Payment Failed | Payment | Critical | Push, Email, SMS |
| 7 | Payment Success | Payment | Medium | Push, Email |
| 8 | Chat Invite | Communication | Medium | Push, Email |
| 9 | New Chat Message | Communication | Low | Push |
| 10 | AI Diagnosis Complete | AI | Medium | Push, Email |
| 11 | Order Status Update | E-commerce | Low | Push, Email |

---

## 📱 Detailed Notification Specifications

### **1. Appointment Confirmed**

**Event Type:** `appointment_confirmed`

**When Triggered:**
- Patient berhasil membuat appointment baru
- Dentist confirm appointment yang pending

**Channels:**
- ✅ Push Notification
- ✅ Email
- ⚠️ SMS (optional)

**Priority:** Medium

**Icon:** `✅` check-circle (Success icon)

**Color:** Success Green (#4CAF50)

**Push Notification Format:**
```javascript
{
  title: "Appointment Confirmed",
  body: "Your appointment with Dr. Sarah is confirmed for Mon, Jan 15, 10:00.",
  data: {
    appointmentId: "123",
    eventType: "appointment_confirmed",
    action: "VIEW_APPOINTMENT"
  },
  icon: "check-circle",
  color: "#4CAF50",
  sound: "default",
  badge: 1
}
```

**UI Component:**
```jsx
<NotificationCard
  type="appointment_confirmed"
  icon="check-circle"
  iconColor="#4CAF50"
  backgroundColor="#E8F5E9"
  timestamp="2 min ago"
>
  <Title>Appointment Confirmed ✅</Title>
  <Message>
    Your appointment with <Bold>Dr. Sarah</Bold> is confirmed for{' '}
    <Bold>Mon, Jan 15, 10:00</Bold>.
  </Message>
  <Actions>
    <Button variant="primary" onPress={viewAppointment}>
      View Details
    </Button>
    <Button variant="text" onPress={addToCalendar}>
      Add to Calendar
    </Button>
  </Actions>
</NotificationCard>
```

---

### **2. Appointment Reminder - 24 Hours**

**Event Type:** `appointment_reminder`

**When Triggered:**
- 24 jam sebelum appointment
- Automated scheduled notification

**Channels:**
- ✅ Push Notification
- ✅ Email
- ✅ SMS

**Priority:** High

**Icon:** `🔔` bell (Reminder icon)

**Color:** Info Blue (#2196F3)

**Push Notification Format:**
```javascript
{
  title: "Appointment Reminder",
  body: "Reminder: Dr. Sarah awaits you tomorrow at 10:00 (Mon, Jan 15).",
  data: {
    appointmentId: "123",
    eventType: "appointment_reminder",
    leadTime: "24h",
    action: "VIEW_APPOINTMENT"
  },
  icon: "bell",
  color: "#2196F3",
  sound: "default",
  badge: 1
}
```

**UI Component:**
```jsx
<NotificationCard
  type="appointment_reminder"
  icon="bell"
  iconColor="#2196F3"
  backgroundColor="#E3F2FD"
  timestamp="8:00 AM"
>
  <Title>Appointment Tomorrow 🔔</Title>
  <Message>
    Reminder: <Bold>Dr. Sarah</Bold> awaits you tomorrow at{' '}
    <Bold>10:00 AM</Bold>.
  </Message>
  <InfoBox>
    <Icon name="map-marker" /> Klinik Gigi Sehat, Jl. Sudirman No. 123
  </InfoBox>
  <Actions>
    <Button variant="primary" onPress={viewAppointment}>
      View Details
    </Button>
    <Button variant="text" onPress={reschedule}>
      Reschedule
    </Button>
  </Actions>
</NotificationCard>
```

---

### **3. Appointment Reminder - 1 Hour**

**Event Type:** `appointment_reminder`

**When Triggered:**
- 1 jam sebelum appointment
- Critical reminder

**Channels:**
- ✅ Push Notification
- ✅ Email
- ✅ SMS

**Priority:** Critical ⚠️

**Icon:** `⏰` alarm (Urgent reminder)

**Color:** Warning Orange (#FF9800)

**Push Notification Format:**
```javascript
{
  title: "⏰ Appointment in 1 Hour!",
  body: "Your appointment with Dr. Sarah starts at 10:00 AM. Don't forget!",
  data: {
    appointmentId: "123",
    eventType: "appointment_reminder",
    leadTime: "1h",
    action: "VIEW_APPOINTMENT"
  },
  icon: "alarm",
  color: "#FF9800",
  sound: "urgent",
  badge: 1,
  priority: "high"
}
```

**UI Component:**
```jsx
<NotificationCard
  type="appointment_reminder_urgent"
  icon="alarm"
  iconColor="#FF9800"
  backgroundColor="#FFF3E0"
  borderColor="#FF9800"
  timestamp="9:00 AM"
  urgent
>
  <Title>⏰ Appointment in 1 Hour!</Title>
  <Message>
    Your appointment with <Bold>Dr. Sarah</Bold> starts at{' '}
    <Bold>10:00 AM</Bold>. Don't forget!
  </Message>
  <Countdown targetTime="10:00 AM">
    <CountdownText>00:58:32</CountdownText>
  </Countdown>
  <Actions>
    <Button variant="warning" onPress={viewAppointment}>
      I'm On My Way
    </Button>
    <Button variant="text" onPress={callClinic}>
      Call Clinic
    </Button>
  </Actions>
</NotificationCard>
```

---

### **4. Appointment Cancelled**

**Event Type:** `appointment_cancelled`

**When Triggered:**
- Patient cancel appointment
- Dentist cancel appointment
- Admin cancel appointment

**Channels:**
- ✅ Push Notification
- ✅ Email
- ✅ SMS

**Priority:** High

**Icon:** `❌` close-circle (Cancel icon)

**Color:** Error Red (#F44336)

**Push Notification Format:**
```javascript
{
  title: "Appointment Cancelled",
  body: "Your appointment on Mon, Jan 15 has been cancelled. Reason: Doctor emergency.",
  data: {
    appointmentId: "123",
    eventType: "appointment_cancelled",
    cancelledBy: "dentist",
    reason: "Doctor emergency",
    action: "VIEW_CANCELLATION"
  },
  icon: "close-circle",
  color: "#F44336",
  sound: "default",
  badge: 1
}
```

**UI Component:**
```jsx
<NotificationCard
  type="appointment_cancelled"
  icon="close-circle"
  iconColor="#F44336"
  backgroundColor="#FFEBEE"
  timestamp="1 hour ago"
>
  <Title>Appointment Cancelled ❌</Title>
  <Message>
    Your appointment on <Bold>Mon, Jan 15</Bold> has been cancelled.
  </Message>
  <InfoBox severity="error">
    <Icon name="info" color="#F44336" />
    <InfoText>
      <Bold>Reason:</Bold> Doctor emergency
    </InfoText>
  </InfoBox>
  {cancellationFee && (
    <InfoBox severity="warning">
      <Icon name="alert" color="#FF9800" />
      <InfoText>
        <Bold>Cancellation fee:</Bold> Rp 50.000
      </InfoText>
    </InfoBox>
  )}
  <Actions>
    <Button variant="error" onPress={bookAgain}>
      Book Another Appointment
    </Button>
    <Button variant="text" onPress={viewDetails}>
      View Details
    </Button>
  </Actions>
</NotificationCard>
```

---

### **5. Appointment Rescheduled**

**Event Type:** `appointment_rescheduled`

**When Triggered:**
- Dentist reschedule appointment
- Patient reschedule appointment

**Channels:**
- ✅ Push Notification
- ✅ Email
- ✅ SMS

**Priority:** High

**Icon:** `🔄` calendar-refresh (Reschedule icon)

**Color:** Info Blue (#2196F3)

**Push Notification Format:**
```javascript
{
  title: "Appointment Rescheduled",
  body: "Your appointment with Dr. Sarah is now scheduled for Tue, Jan 16, 14:00.",
  data: {
    appointmentId: "123",
    eventType: "appointment_rescheduled",
    oldDate: "2024-01-15T10:00:00Z",
    newDate: "2024-01-16T14:00:00Z",
    action: "VIEW_APPOINTMENT"
  },
  icon: "calendar-refresh",
  color: "#2196F3",
  sound: "default",
  badge: 1
}
```

**UI Component:**
```jsx
<NotificationCard
  type="appointment_rescheduled"
  icon="calendar-refresh"
  iconColor="#2196F3"
  backgroundColor="#E3F2FD"
  timestamp="30 min ago"
>
  <Title>Appointment Rescheduled 🔄</Title>
  <Message>
    Your appointment with <Bold>Dr. Sarah</Bold> has been rescheduled.
  </Message>
  <ComparisonBox>
    <OldDate strikethrough>
      <Icon name="calendar" color="#757575" />
      <Text color="#757575">Mon, Jan 15, 10:00</Text>
    </OldDate>
    <Arrow>→</Arrow>
    <NewDate>
      <Icon name="calendar" color="#2196F3" />
      <Text color="#2196F3" fontWeight="bold">
        Tue, Jan 16, 14:00
      </Text>
    </NewDate>
  </ComparisonBox>
  <Actions>
    <Button variant="primary" onPress={acceptReschedule}>
      Accept
    </Button>
    <Button variant="text" onPress={proposeNewTime}>
      Propose New Time
    </Button>
  </Actions>
</NotificationCard>
```

---

### **6. Payment Failed**

**Event Type:** `appointment_payment_failed`

**When Triggered:**
- Payment gateway error
- Insufficient balance
- Card declined
- Payment timeout

**Channels:**
- ✅ Push Notification
- ✅ Email
- ✅ SMS

**Priority:** Critical ⚠️

**Icon:** `💳` credit-card-off (Payment error icon)

**Color:** Error Red (#F44336)

**Push Notification Format:**
```javascript
{
  title: "Payment Failed",
  body: "Payment of Rp 150.000 for appointment on Mon, Jan 15 could not be processed.",
  data: {
    appointmentId: "123",
    paymentId: "pay_456",
    eventType: "appointment_payment_failed",
    amount: 150000,
    reason: "Insufficient balance",
    action: "RETRY_PAYMENT"
  },
  icon: "credit-card-off",
  color: "#F44336",
  sound: "urgent",
  badge: 1,
  priority: "high"
}
```

**UI Component:**
```jsx
<NotificationCard
  type="payment_failed"
  icon="credit-card-off"
  iconColor="#F44336"
  backgroundColor="#FFEBEE"
  borderColor="#F44336"
  timestamp="Just now"
  urgent
>
  <Title>💳 Payment Failed</Title>
  <Message>
    We were unable to process your payment of{' '}
    <Bold>Rp 150.000</Bold> for the appointment on{' '}
    <Bold>Mon, Jan 15</Bold>.
  </Message>
  <InfoBox severity="error">
    <Icon name="alert-circle" color="#F44336" />
    <InfoText>
      <Bold>Reason:</Bold> Insufficient balance
    </InfoText>
  </InfoBox>
  <WarningBox>
    <Icon name="clock" color="#FF9800" />
    <WarningText>
      Your appointment will be cancelled if payment is not completed within{' '}
      <Bold>24 hours</Bold>.
    </WarningText>
  </WarningBox>
  <Actions>
    <Button variant="error" onPress={retryPayment}>
      Retry Payment
    </Button>
    <Button variant="text" onPress={changePaymentMethod}>
      Change Payment Method
    </Button>
  </Actions>
</NotificationCard>
```

---

### **7. Payment Success**

**Event Type:** `appointment_payment_success`

**When Triggered:**
- Payment successfully processed
- Booking fee paid
- Treatment fee paid

**Channels:**
- ✅ Push Notification
- ✅ Email

**Priority:** Medium

**Icon:** `✅` check-circle (Success icon)

**Color:** Success Green (#4CAF50)

**Push Notification Format:**
```javascript
{
  title: "Payment Successful",
  body: "Payment of Rp 150.000 received. Your appointment is confirmed!",
  data: {
    appointmentId: "123",
    paymentId: "pay_456",
    eventType: "appointment_payment_success",
    amount: 150000,
    action: "VIEW_RECEIPT"
  },
  icon: "check-circle",
  color: "#4CAF50",
  sound: "success",
  badge: 1
}
```

**UI Component:**
```jsx
<NotificationCard
  type="payment_success"
  icon="check-circle"
  iconColor="#4CAF50"
  backgroundColor="#E8F5E9"
  timestamp="Just now"
>
  <Title>Payment Successful ✅</Title>
  <Message>
    Payment of <Bold>Rp 150.000</Bold> received. Your appointment is confirmed!
  </Message>
  <PaymentSummary>
    <Row>
      <Label>Transaction ID:</Label>
      <Value>PAY-20240115-123</Value>
    </Row>
    <Row>
      <Label>Payment Method:</Label>
      <Value>BCA Virtual Account</Value>
    </Row>
    <Row>
      <Label>Amount:</Label>
      <Value fontWeight="bold">Rp 150.000</Value>
    </Row>
  </PaymentSummary>
  <Actions>
    <Button variant="success" onPress={viewReceipt}>
      View Receipt
    </Button>
    <Button variant="text" onPress={downloadInvoice}>
      Download Invoice
    </Button>
  </Actions>
</NotificationCard>
```

---

### **8. Chat Invite**

**Event Type:** `chat_invite`

**When Triggered:**
- Dentist mengundang patient ke chat room
- Teleconsultation dimulai
- Video call invitation

**Channels:**
- ✅ Push Notification
- ✅ Email

**Priority:** Medium

**Icon:** `💬` message-circle (Chat icon)

**Color:** Primary Teal (#00BFA6)

**Push Notification Format:**
```javascript
{
  title: "Teleconsult Chat Invitation",
  body: "Dr. Sarah invited you to join consultation room.",
  data: {
    appointmentId: "123",
    chatRoomId: "room_789",
    eventType: "chat_invite",
    initiatorId: "456",
    initiatorName: "Dr. Sarah",
    action: "OPEN_CHAT"
  },
  icon: "message-circle",
  color: "#00BFA6",
  sound: "message",
  badge: 1
}
```

**UI Component:**
```jsx
<NotificationCard
  type="chat_invite"
  icon="message-circle"
  iconColor="#00BFA6"
  backgroundColor="#E0F2F1"
  timestamp="2 min ago"
>
  <Title>💬 Teleconsult Chat Invitation</Title>
  <Message>
    <Bold>Dr. Sarah</Bold> invited you to join consultation room.
  </Message>
  <AvatarRow>
    <Avatar source={{ uri: dentistAvatar }} size={40} />
    <DentistInfo>
      <DentistName>Dr. Sarah Johnson</DentistName>
      <DentistStatus>
        <OnlineIndicator /> Online
      </DentistStatus>
    </DentistInfo>
  </AvatarRow>
  <Actions>
    <Button variant="primary" onPress={joinChat}>
      Join Chat
    </Button>
    <Button variant="outline" onPress={startVideoCall}>
      <Icon name="video" /> Video Call
    </Button>
  </Actions>
</NotificationCard>
```

---

### **9. New Chat Message**

**Event Type:** `chat_new_message`

**When Triggered:**
- Dentist mengirim pesan baru
- Unread message dari teleconsultation

**Channels:**
- ✅ Push Notification

**Priority:** Low

**Icon:** `💬` message (Chat icon)

**Color:** Primary Teal (#00BFA6)

**Push Notification Format:**
```javascript
{
  title: "Dr. Sarah",
  body: "Untuk mempercepat penyembuhan, konsumsi obat secara teratur ya.",
  data: {
    appointmentId: "123",
    chatRoomId: "room_789",
    messageId: "msg_999",
    eventType: "chat_new_message",
    senderId: "456",
    senderName: "Dr. Sarah",
    action: "OPEN_CHAT"
  },
  icon: "message",
  color: "#00BFA6",
  sound: "message",
  badge: 1
}
```

**UI Component:**
```jsx
<NotificationCard
  type="chat_message"
  icon="message"
  iconColor="#00BFA6"
  backgroundColor="#FFFFFF"
  compact
  timestamp="Just now"
>
  <Header>
    <Avatar source={{ uri: dentistAvatar }} size={32} />
    <Title>Dr. Sarah</Title>
    <Badge>1</Badge>
  </Header>
  <Message numberOfLines={2}>
    Untuk mempercepat penyembuhan, konsumsi obat secara teratur ya.
  </Message>
  <Actions>
    <Button variant="text" size="small" onPress={openChat}>
      Reply
    </Button>
  </Actions>
</NotificationCard>
```

---

### **10. AI Diagnosis Complete**

**Event Type:** `ai_diagnosis_complete`

**When Triggered:**
- AI selesai menganalisis foto gigi
- Hasil diagnosis sudah tersedia

**Channels:**
- ✅ Push Notification
- ✅ Email

**Priority:** Medium

**Icon:** `🤖` brain (AI icon)

**Color:** Secondary Blue (#1976D2)

**Push Notification Format:**
```javascript
{
  title: "AI Diagnosis Complete",
  body: "Your dental scan results are ready. Tap to view recommendations.",
  data: {
    diagnosisId: "diag_321",
    eventType: "ai_diagnosis_complete",
    confidence: 95,
    findings: ["cavity", "plaque"],
    riskLevel: "medium",
    action: "VIEW_RESULTS"
  },
  icon: "brain",
  color: "#1976D2",
  sound: "default",
  badge: 1
}
```

**UI Component:**
```jsx
<NotificationCard
  type="ai_diagnosis"
  icon="brain"
  iconColor="#1976D2"
  backgroundColor="#E3F2FD"
  timestamp="5 min ago"
>
  <Title>🤖 AI Diagnosis Complete</Title>
  <Message>
    Your dental scan results are ready. Review recommendations now.
  </Message>
  <ResultPreview>
    <ConfidenceBadge color="#FF9800">95% Confidence</ConfidenceBadge>
    <FindingsList>
      <Finding severity="medium">
        <Icon name="alert-circle" color="#FF9800" />
        <Text>Possible cavity detected</Text>
      </Finding>
      <Finding severity="low">
        <Icon name="info-circle" color="#2196F3" />
        <Text>Minor plaque buildup</Text>
      </Finding>
    </FindingsList>
  </ResultPreview>
  <Actions>
    <Button variant="primary" onPress={viewResults}>
      View Full Results
    </Button>
    <Button variant="text" onPress={bookAppointment}>
      Book Appointment
    </Button>
  </Actions>
</NotificationCard>
```

---

### **11. Order Status Update**

**Event Type:** `order_status_update`

**When Triggered:**
- Order confirmed
- Order shipped
- Order delivered
- Order cancelled

**Channels:**
- ✅ Push Notification
- ✅ Email

**Priority:** Low

**Icon:** `📦` package (Order icon)

**Color:** Varies by status

**Push Notification Format:**
```javascript
{
  title: "Order Shipped",
  body: "Your order #ORD-123 has been shipped and on the way!",
  data: {
    orderId: "ORD-123",
    eventType: "order_status_update",
    status: "shipped",
    trackingNumber: "JNE1234567890",
    estimatedDelivery: "2024-01-17",
    action: "TRACK_ORDER"
  },
  icon: "package",
  color: "#00BFA6",
  sound: "default",
  badge: 1
}
```

**UI Component:**
```jsx
<NotificationCard
  type="order_update"
  icon="package"
  iconColor={statusColors[orderStatus]}
  backgroundColor={statusBackgrounds[orderStatus]}
  timestamp="1 hour ago"
>
  <Title>📦 Order {statusLabels[orderStatus]}</Title>
  <Message>
    Your order <Bold>#ORD-123</Bold> has been shipped and on the way!
  </Message>
  <OrderSummary>
    <ProductImage source={{ uri: productImage }} />
    <ProductInfo>
      <ProductName>Oral-B Electric Toothbrush</ProductName>
      <ProductQty>Qty: 1</ProductQty>
    </ProductInfo>
  </OrderSummary>
  <TrackingInfo>
    <Icon name="truck" color="#00BFA6" />
    <TrackingText>
      Tracking: <Bold>JNE1234567890</Bold>
    </TrackingText>
    <EstimatedDelivery>
      Est. delivery: <Bold>Wed, Jan 17</Bold>
    </EstimatedDelivery>
  </TrackingInfo>
  <Actions>
    <Button variant="primary" onPress={trackOrder}>
      Track Order
    </Button>
    <Button variant="text" onPress={viewOrderDetails}>
      View Details
    </Button>
  </Actions>
</NotificationCard>
```

---

## 🔔 Notification Channels

### **Push Notification**
- **Platform:** Firebase Cloud Messaging (FCM)
- **Delivery:** Real-time, instant
- **User Control:** Can enable/disable per notification type
- **Sound:** Customizable (default, urgent, success, message)
- **Badge:** App icon badge count
- **Deep Link:** Direct navigation to specific screen

### **Email**
- **Platform:** SendGrid / AWS SES
- **Delivery:** Within 1-5 minutes
- **Format:** HTML + Plain text
- **Unsubscribe:** Per notification type
- **Tracking:** Open rate, click rate

### **SMS**
- **Platform:** Twilio
- **Delivery:** Within 30 seconds
- **Format:** Plain text (max 160 chars)
- **Cost:** Charged per SMS
- **Opt-out:** Reply STOP to unsubscribe

---

## 📊 Notification Priority Levels

### **Critical (Red)**
- 🚨 Payment Failed
- ⏰ Appointment in 1 Hour
- **Characteristics:**
  - Sound: Urgent/loud
  - Vibration: Strong
  - Heads-up notification (Android)
  - Banner notification (iOS)
  - Cannot be silenced by DND (optional)

### **High (Orange)**
- 🔔 Appointment Reminder (24h)
- ❌ Appointment Cancelled
- 🔄 Appointment Rescheduled
- **Characteristics:**
  - Sound: Default
  - Vibration: Normal
  - Heads-up notification
  - Priority delivery

### **Medium (Blue/Green)**
- ✅ Appointment Confirmed
- ✅ Payment Success
- 💬 Chat Invite
- 🤖 AI Diagnosis Complete
- **Characteristics:**
  - Sound: Default
  - Vibration: Normal
  - Standard notification

### **Low (Gray)**
- 💬 New Chat Message
- 📦 Order Update
- **Characteristics:**
  - Sound: Silent (optional)
  - Vibration: None
  - Silent notification
  - Grouped with similar

---

## 🎨 UI Components

### **Notification List Screen**

```jsx
<Screen>
  <Header>
    <Title>Notifications</Title>
    <Badge count={5} />
    <Actions>
      <IconButton icon="settings" onPress={openSettings} />
      <IconButton icon="check-all" onPress={markAllAsRead} />
    </Actions>
  </Header>

  <FilterTabs>
    <Tab active={filter === 'all'} onPress={() => setFilter('all')}>
      All ({totalCount})
    </Tab>
    <Tab active={filter === 'unread'} onPress={() => setFilter('unread')}>
      Unread ({unreadCount})
    </Tab>
    <Tab active={filter === 'appointments'} onPress={() => setFilter('appointments')}>
      Appointments
    </Tab>
    <Tab active={filter === 'payments'} onPress={() => setFilter('payments')}>
      Payments
    </Tab>
  </FilterTabs>

  <NotificationList>
    <SectionHeader>Today</SectionHeader>
    {todayNotifications.map(notif => (
      <NotificationItem key={notif.id} {...notif} />
    ))}

    <SectionHeader>Yesterday</SectionHeader>
    {yesterdayNotifications.map(notif => (
      <NotificationItem key={notif.id} {...notif} />
    ))}

    <SectionHeader>This Week</SectionHeader>
    {weekNotifications.map(notif => (
      <NotificationItem key={notif.id} {...notif} />
    ))}
  </NotificationList>
</Screen>
```

### **Notification Item Component**

```jsx
<NotificationItem
  unread={!notification.read}
  onPress={() => handleNotificationPress(notification)}
  onLongPress={() => showOptions(notification)}
>
  <IconContainer backgroundColor={notification.color}>
    <Icon name={notification.icon} color="#FFFFFF" size={24} />
  </IconContainer>

  <Content>
    <Header>
      <Title numberOfLines={1}>{notification.title}</Title>
      <Timestamp>{formatTimestamp(notification.timestamp)}</Timestamp>
    </Header>

    <Message numberOfLines={2}>{notification.message}</Message>

    {notification.actionButtons && (
      <ActionButtons>
        {notification.actionButtons.map(button => (
          <ActionButton key={button.id} {...button} />
        ))}
      </ActionButtons>
    )}
  </Content>

  {notification.unread && <UnreadDot />}
</NotificationItem>
```

### **Empty State**

```jsx
<EmptyState>
  <Illustration source={require('@/assets/empty-notifications.png')} />
  <EmptyTitle>No Notifications Yet</EmptyTitle>
  <EmptyMessage>
    You're all caught up! Notifications will appear here when you have new updates.
  </EmptyMessage>
  <Button variant="outline" onPress={goToAppointments}>
    Book Your First Appointment
  </Button>
</EmptyState>
```

---

## ⚙️ Notification Settings

### **Settings Screen UI**

```jsx
<SettingsScreen>
  <Header>
    <Title>Notification Settings</Title>
  </Header>

  <Section>
    <SectionTitle>Appointment Notifications</SectionTitle>

    <SettingItem>
      <SettingLabel>Appointment Confirmed</SettingLabel>
      <ToggleGroup>
        <Toggle
          label="Push"
          value={settings.appointment_confirmed.push}
          onValueChange={updateSetting}
        />
        <Toggle
          label="Email"
          value={settings.appointment_confirmed.email}
          onValueChange={updateSetting}
        />
        <Toggle
          label="SMS"
          value={settings.appointment_confirmed.sms}
          onValueChange={updateSetting}
        />
      </ToggleGroup>
    </SettingItem>

    <SettingItem>
      <SettingLabel>Appointment Reminders</SettingLabel>
      <ToggleGroup>
        <Toggle label="Push" value={true} disabled />
        <Toggle label="Email" value={true} />
        <Toggle label="SMS" value={false} />
      </ToggleGroup>
      <SettingNote>
        ⚠️ Push reminders cannot be disabled for safety.
      </SettingNote>
    </SettingItem>

    <SettingItem>
      <SettingLabel>Appointment Cancelled</SettingLabel>
      <ToggleGroup>
        <Toggle label="Push" value={true} disabled />
        <Toggle label="Email" value={true} disabled />
        <Toggle label="SMS" value={true} />
      </ToggleGroup>
    </SettingItem>
  </Section>

  <Section>
    <SectionTitle>Payment Notifications</SectionTitle>

    <SettingItem>
      <SettingLabel>Payment Failed</SettingLabel>
      <ToggleGroup>
        <Toggle label="Push" value={true} disabled />
        <Toggle label="Email" value={true} disabled />
        <Toggle label="SMS" value={true} disabled />
      </ToggleGroup>
      <SettingNote>
        🚨 Critical notifications cannot be disabled.
      </SettingNote>
    </SettingItem>

    <SettingItem>
      <SettingLabel>Payment Success</SettingLabel>
      <ToggleGroup>
        <Toggle label="Push" value={true} />
        <Toggle label="Email" value={true} />
      </ToggleGroup>
    </SettingItem>
  </Section>

  <Section>
    <SectionTitle>Communication</SectionTitle>

    <SettingItem>
      <SettingLabel>Chat Invitations</SettingLabel>
      <ToggleGroup>
        <Toggle label="Push" value={true} />
        <Toggle label="Email" value={true} />
      </ToggleGroup>
    </SettingItem>

    <SettingItem>
      <SettingLabel>New Chat Messages</SettingLabel>
      <ToggleGroup>
        <Toggle label="Push" value={true} />
      </ToggleGroup>
    </SettingItem>
  </Section>

  <Section>
    <SectionTitle>AI & E-commerce</SectionTitle>

    <SettingItem>
      <SettingLabel>AI Diagnosis Results</SettingLabel>
      <ToggleGroup>
        <Toggle label="Push" value={true} />
        <Toggle label="Email" value={true} />
      </ToggleGroup>
    </SettingItem>

    <SettingItem>
      <SettingLabel>Order Updates</SettingLabel>
      <ToggleGroup>
        <Toggle label="Push" value={true} />
        <Toggle label="Email" value={true} />
      </ToggleGroup>
    </SettingItem>
  </Section>

  <Section>
    <SectionTitle>General Settings</SectionTitle>

    <SettingItem>
      <SettingLabel>Notification Sound</SettingLabel>
      <Picker
        selectedValue={settings.sound}
        onValueChange={updateSound}
      >
        <PickerItem label="Default" value="default" />
        <PickerItem label="Subtle" value="subtle" />
        <PickerItem label="Urgent" value="urgent" />
        <PickerItem label="Silent" value="silent" />
      </Picker>
    </SettingItem>

    <SettingItem>
      <SettingLabel>Vibration</SettingLabel>
      <Toggle value={settings.vibration} onValueChange={updateVibration} />
    </SettingItem>

    <SettingItem>
      <SettingLabel>Badge Count</SettingLabel>
      <Toggle value={settings.badge} onValueChange={updateBadge} />
    </SettingItem>
  </Section>

  <QuietHours>
    <SectionTitle>Quiet Hours</SectionTitle>
    <SettingItem>
      <SettingLabel>Enable Quiet Hours</SettingLabel>
      <Toggle value={settings.quietHours.enabled} />
    </SettingItem>
    {settings.quietHours.enabled && (
      <>
        <TimePicker
          label="Start Time"
          value={settings.quietHours.start}
          onChange={updateQuietStart}
        />
        <TimePicker
          label="End Time"
          value={settings.quietHours.end}
          onChange={updateQuietEnd}
        />
        <SettingNote>
          Only critical notifications will be delivered during quiet hours.
        </SettingNote>
      </>
    )}
  </QuietHours>
</SettingsScreen>
```

---

## 🔧 Implementation Examples

### **1. React Native Push Notification Handler**

```javascript
// src/services/notificationService.js
import * as Notifications from 'expo-notifications';
import { useNavigation } from '@react-navigation/native';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const { eventType, priority } = notification.request.content.data;
    
    return {
      shouldShowAlert: true,
      shouldPlaySound: priority === 'critical' || priority === 'high',
      shouldSetBadge: true,
      priority: priority === 'critical' ? 'max' : 'high',
    };
  },
});

// Handle notification tap
export const useNotificationHandler = () => {
  const navigation = useNavigation();

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const { data } = response.notification.request.content;
        handleNotificationAction(data, navigation);
      }
    );

    return () => subscription.remove();
  }, [navigation]);
};

// Route based on notification type
const handleNotificationAction = (data, navigation) => {
  const { eventType, action, appointmentId, chatRoomId, diagnosisId, orderId } = data;

  switch (action) {
    case 'VIEW_APPOINTMENT':
      navigation.navigate('AppointmentDetail', { id: appointmentId });
      break;
    case 'OPEN_CHAT':
      navigation.navigate('Chat', { roomId: chatRoomId });
      break;
    case 'VIEW_RESULTS':
      navigation.navigate('AIDiagnosisResults', { id: diagnosisId });
      break;
    case 'RETRY_PAYMENT':
      navigation.navigate('Payment', { appointmentId });
      break;
    case 'TRACK_ORDER':
      navigation.navigate('OrderTracking', { orderId });
      break;
    default:
      navigation.navigate('Notifications');
  }
};
```

### **2. Notification Badge Count**

```javascript
// src/hooks/useNotificationBadge.js
import { useState, useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { useQuery } from '@tanstack/react-query';
import { notificationsApi } from '@/api/notifications.api';

export const useNotificationBadge = () => {
  const { data: unreadCount } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationsApi.getUnreadCount(),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  useEffect(() => {
    if (unreadCount !== undefined) {
      Notifications.setBadgeCountAsync(unreadCount);
    }
  }, [unreadCount]);

  return unreadCount;
};
```

### **3. Local Notification for Reminders**

```javascript
// src/services/reminderService.js
import * as Notifications from 'expo-notifications';

export const scheduleAppointmentReminder = async (appointment) => {
  const appointmentDate = new Date(appointment.startsAt);
  
  // 24 hours before
  const reminder24h = new Date(appointmentDate.getTime() - 24 * 60 * 60 * 1000);
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Appointment Tomorrow 🔔',
      body: `Reminder: ${appointment.dentistName} awaits you tomorrow at ${formatTime(appointmentDate)}.`,
      data: {
        appointmentId: appointment.id,
        eventType: 'appointment_reminder',
        leadTime: '24h',
      },
      sound: 'default',
    },
    trigger: reminder24h,
  });

  // 1 hour before
  const reminder1h = new Date(appointmentDate.getTime() - 60 * 60 * 1000);
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '⏰ Appointment in 1 Hour!',
      body: `Your appointment starts at ${formatTime(appointmentDate)}. Don't forget!`,
      data: {
        appointmentId: appointment.id,
        eventType: 'appointment_reminder',
        leadTime: '1h',
      },
      sound: 'urgent',
      priority: 'high',
    },
    trigger: reminder1h,
  });
};
```

---

## 📊 Notification Analytics

### **Metrics to Track:**

1. **Delivery Rate**
   - Push: ~98%
   - Email: ~95%
   - SMS: ~99%

2. **Open Rate**
   - Push: ~20-30%
   - Email: ~15-25%
   - SMS: ~98%

3. **Action Rate**
   - Button clicks
   - Deep link navigation
   - Conversion (e.g., payment retry success)

4. **User Preferences**
   - Most disabled notification types
   - Channel preferences
   - Quiet hours usage

---

## ✅ Implementation Checklist

- [ ] Push notification setup (Firebase FCM)
- [ ] Email notification setup (SendGrid/SES)
- [ ] SMS notification setup (Twilio)
- [ ] Notification list screen
- [ ] Notification settings screen
- [ ] Deep linking handlers
- [ ] Badge count sync
- [ ] Local reminder scheduling
- [ ] Quiet hours implementation
- [ ] Analytics tracking
- [ ] Test all notification types
- [ ] Test all channels
- [ ] Test edge cases (offline, background)

---

**Last Updated:** November 13, 2025
**Version:** 1.0.0
**Total Notification Types:** 11
