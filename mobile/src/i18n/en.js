export const en = {
  common: {
    actions: {
      retry: 'Retry',
      close: 'Close',
      continue: 'Continue',
      open: 'Open',
    },
  },
  mobile: {
    booking: {
      availabilityUnknown: 'Availability could not be confirmed. Tap to try loading slots.',
    },
    payment: {
      title: 'Payment',
      preparing: 'Preparing payment gateway...',
      openPayment: 'Open Payment Page',
      retryPayment: 'Create a new transaction',
      expiredTitle: 'Payment Expired',
      pendingTitle: 'Waiting for Payment',
    },
    teledentistry: {
      network: {
        diagnostics: 'Connection Diagnostics',
        lowQualityTitle: 'Unstable connection',
        autoAudioOnly: 'Network quality is very low. Video was turned off to keep audio stable.',
        autoAudioOnlyDescription: 'Video was temporarily disabled to keep audio stable.',
        retryVideo: 'Try turning video back on',
      },
      preCall: {
        title: 'Pre-call System Check',
        camera: 'Camera',
        microphone: 'Microphone',
        connection: 'Connection',
        battery: 'Battery',
        unavailable: 'Unavailable',
        ready: 'Ready to join',
        joinAudioOnly: 'Join audio only',
      },
      chat: {
        sendFailed: 'Message failed to send. The text is kept so you can retry.',
        retrySend: 'Retry sending',
      },
    },
    review: {
      photoMetadataOnly: 'Review photos are not uploaded to the server in this version.',
    },
  },
};

export default en;
