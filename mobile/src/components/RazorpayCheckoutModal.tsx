import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { X, ShieldCheck, RefreshCw, AlertCircle } from 'lucide-react-native';

interface RazorpayCheckoutModalProps {
  visible: boolean;
  amountInr: number;
  orderNumber: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  onSuccess: (paymentId: string) => void;
  onFailure: (errorDesc: string) => void;
  onClose: () => void;
}

export const RAZORPAY_KEY_ID = 'rzp_live_Ts2IomeLgEA37e';

export function RazorpayCheckoutModal({
  visible,
  amountInr,
  orderNumber,
  customerName = 'Easy Farm Member',
  customerEmail = 'customer@easyfarm.in',
  customerPhone = '9999999999',
  onSuccess,
  onFailure,
  onClose,
}: RazorpayCheckoutModalProps) {
  const [webViewLoading, setWebViewLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  if (!visible) return null;

  const amountInPaise = Math.max(100, Math.round(amountInr * 100));

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>Easy Farm UPI Payment</title>
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 20px;
    }
    .card {
      background: #ffffff;
      border-radius: 20px;
      padding: 28px 20px;
      text-align: center;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);
      border: 1px solid #e2e8f0;
      max-width: 360px;
      width: 100%;
    }
    .spinner {
      border: 3px solid #e2e8f0;
      border-top: 3px solid #065f46;
      border-radius: 50%;
      width: 44px;
      height: 44px;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 16px;
    }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    .title { font-size: 18px; font-weight: 800; color: #0f172a; margin-bottom: 6px; }
    .sub { font-size: 13px; color: #64748b; line-height: 1.5; margin-bottom: 12px; }
    .badge {
      display: inline-block;
      background: #ecfdf5;
      color: #065f46;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 800;
      border: 1px solid #a7f3d0;
    }
    .upi-apps {
      margin-top: 18px;
      padding-top: 16px;
      border-top: 1px dashed #e2e8f0;
      font-size: 12px;
      color: #475569;
      font-weight: 600;
    }
    .btn-retry {
      display: inline-block;
      margin-top: 16px;
      background: #065f46;
      color: #ffffff;
      padding: 10px 20px;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 700;
      border: none;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="spinner"></div>
    <div class="title">Easy Farm UPI Gateway</div>
    <div class="sub">Launching Razorpay secure payment sheet...</div>
    <div class="badge">₹${amountInr} • 100% Secure</div>
    <div class="upi-apps">
      Supports Google Pay, PhonePe, Paytm, BHIM & UPI QR
    </div>
    <button class="btn-retry" onclick="launchRazorpay()">Re-open Payment Gateway</button>
  </div>

  <script>
    function notify(payload) {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify(payload));
      }
    }

    var rzpInstance = null;

    function launchRazorpay() {
      var options = {
        key: "${RAZORPAY_KEY_ID}",
        amount: "${amountInPaise}",
        currency: "INR",
        name: "Easy Farm",
        description: "Sunday Fresh Harvest Delivery (#${orderNumber})",
        image: "https://easyfarm.co.in/images/easyfarm-logo.png",
        prefill: {
          name: "${customerName.replace(/"/g, '')}",
          email: "${customerEmail.replace(/"/g, '')}",
          contact: "${customerPhone.replace(/"/g, '')}",
          method: "upi"
        },
        config: {
          display: {
            blocks: {
              upi: {
                name: "Pay using UPI",
                instruments: [
                  {
                    method: "upi"
                  }
                ]
              }
            },
            sequence: ["block.upi"],
            preferences: {
              show_default_blocks: false
            }
          }
        },
        theme: {
          color: "#065f46"
        },
        modal: {
          ondismiss: function() {
            notify({ type: 'DISMISSED' });
          }
        },
        handler: function(response) {
          notify({
            type: 'SUCCESS',
            payment_id: response.razorpay_payment_id || ('pay_' + Date.now()),
            order_id: response.razorpay_order_id || '',
            signature: response.razorpay_signature || ''
          });
        }
      };

      try {
        if (typeof Razorpay === 'undefined') {
          notify({ type: 'FAILED', description: 'Razorpay SDK is loading. Please tap retry.' });
          return;
        }
        rzpInstance = new Razorpay(options);
        rzpInstance.on('payment.failed', function(resp) {
          notify({
            type: 'FAILED',
            description: resp.error ? resp.error.description : 'Payment transaction failed'
          });
        });
        rzpInstance.open();
      } catch(err) {
        notify({ type: 'FAILED', description: err.message || 'Error launching Razorpay' });
      }
    }

    window.onload = function() {
      setTimeout(function() {
        launchRazorpay();
      }, 400);
    };
  </script>
</body>
</html>
`;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
            <X size={20} color="#0f172a" />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <ShieldCheck size={16} color="#059669" />
            <Text style={styles.headerTitle}>UPI Secure Gateway</Text>
          </View>
          <View style={{ width: 36 }} />
        </View>

        {/* WebView with UPI intent handler */}
        <View style={styles.webWrap}>
          <WebView
            originWhitelist={['*']}
            source={{ html: htmlContent }}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            allowFileAccess={true}
            startInLoadingState={true}
            scalesPageToFit={true}
            onLoadStart={() => setWebViewLoading(true)}
            onLoadEnd={() => setWebViewLoading(false)}
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              setLoadError(nativeEvent.description || 'Could not load payment gateway.');
            }}
            onShouldStartLoadWithRequest={(request) => {
              const url = request.url;
              // Intercept UPI intents and launch external UPI apps (Google Pay, PhonePe, Paytm, BHIM, Cred)
              if (
                url.startsWith('upi://') ||
                url.startsWith('tez://') ||
                url.startsWith('phonepe://') ||
                url.startsWith('paytmmp://') ||
                url.startsWith('credpay://') ||
                url.startsWith('bhim://') ||
                url.startsWith('intent://')
              ) {
                Linking.openURL(url).catch((err) => {
                  console.warn('Could not launch external UPI app:', err);
                });
                return false;
              }
              return true;
            }}
            onMessage={(event) => {
              try {
                const data = JSON.parse(event.nativeEvent.data);
                if (data.type === 'SUCCESS') {
                  onSuccess(data.payment_id || `pay_${Date.now()}`);
                } else if (data.type === 'FAILED') {
                  onFailure(data.description || 'Payment was unsuccessful');
                } else if (data.type === 'DISMISSED') {
                  onClose();
                }
              } catch (e) {
                console.warn('Razorpay postMessage parse error:', e);
              }
            }}
          />

          {webViewLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#065f46" />
              <Text style={styles.loadingText}>Connecting to Razorpay UPI Gateway...</Text>
            </View>
          )}

          {loadError && (
            <View style={styles.errorOverlay}>
              <AlertCircle size={32} color="#dc2626" />
              <Text style={styles.errorTitle}>Gateway Load Error</Text>
              <Text style={styles.errorSub}>{loadError}</Text>
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={() => setLoadError(null)}
                activeOpacity={0.8}
              >
                <RefreshCw size={14} color="#ffffff" />
                <Text style={styles.retryBtnText}>Retry Connection</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  webWrap: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: '#64748b',
    fontWeight: '700',
  },
  errorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    zIndex: 10,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 12,
  },
  errorSub: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#065f46',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
});
