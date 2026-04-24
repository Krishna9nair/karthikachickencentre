#!/usr/bin/env python3
"""
Fresh Cluck Backend API Testing Script
Tests all backend endpoints as specified in the review request.
"""

import requests
import json
import sys
from typing import Dict, Any, Optional

# Configuration
BASE_URL = "https://karthik-chicken-app.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

class FreshCluckAPITester:
    def __init__(self):
        self.session = requests.Session()
        self.rider_token = None
        self.test_results = []
        
    def log_test(self, test_name: str, success: bool, details: str, response_data: Any = None):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if not success or response_data:
            print(f"   Details: {details}")
            if response_data:
                print(f"   Response: {json.dumps(response_data, indent=2)}")
        print()
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details,
            "response": response_data
        })
    
    def test_1_get_shop_settings(self):
        """Test GET /api/public/shop"""
        try:
            response = self.session.get(f"{API_BASE}/public/shop")
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["shop_name", "address", "contact_phone"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_test(
                        "GET /api/public/shop",
                        False,
                        f"Missing required fields: {missing_fields}",
                        data
                    )
                else:
                    self.log_test(
                        "GET /api/public/shop",
                        True,
                        f"Shop settings retrieved successfully. Shop: {data.get('shop_name')}",
                        data
                    )
            else:
                self.log_test(
                    "GET /api/public/shop",
                    False,
                    f"Expected status 200, got {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "GET /api/public/shop",
                False,
                f"Request failed: {str(e)}"
            )
    
    def test_2_get_products(self):
        """Test GET /api/public/products"""
        try:
            response = self.session.get(f"{API_BASE}/public/products")
            
            if response.status_code == 200:
                data = response.json()
                
                # Check response structure
                if "products" not in data or "date" not in data:
                    self.log_test(
                        "GET /api/public/products",
                        False,
                        "Response missing 'products' or 'date' field",
                        data
                    )
                    return
                
                products = data["products"]
                
                # Check if we have 8 active products
                if len(products) != 8:
                    self.log_test(
                        "GET /api/public/products",
                        False,
                        f"Expected 8 products, got {len(products)}",
                        data
                    )
                    return
                
                # Check each product has a price field
                products_without_price = [p for p in products if "price" not in p or p["price"] is None]
                
                if products_without_price:
                    self.log_test(
                        "GET /api/public/products",
                        False,
                        f"{len(products_without_price)} products missing price field",
                        {"products_without_price": [p.get("name", "Unknown") for p in products_without_price]}
                    )
                else:
                    self.log_test(
                        "GET /api/public/products",
                        True,
                        f"Retrieved {len(products)} products, all with prices. Date: {data['date']}",
                        {"sample_product": products[0] if products else None}
                    )
            else:
                self.log_test(
                    "GET /api/public/products",
                    False,
                    f"Expected status 200, got {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "GET /api/public/products",
                False,
                f"Request failed: {str(e)}"
            )
    
    def test_3_create_order(self):
        """Test POST /api/payments/create-order"""
        sample_cart = {
            "customer_name": "Rajesh Kumar",
            "customer_phone": "9876543210",
            "customer_address": "123 MG Road, Bangalore",
            "delivery_lat": 19.0,
            "delivery_lng": 73.0,
            "items": [
                {
                    "product_id": "abc",
                    "name": "Whole Chicken",
                    "qty": 1,
                    "price": 220
                }
            ],
            "total_amount": 220,
            "notes": "Please deliver fresh"
        }
        
        try:
            response = self.session.post(
                f"{API_BASE}/payments/create-order",
                json=sample_cart,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["razorpay_order_id", "razorpay_key_id", "amount", "local_order_id"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_test(
                        "POST /api/payments/create-order",
                        False,
                        f"Missing required fields: {missing_fields}",
                        data
                    )
                else:
                    # Verify razorpay_key_id matches expected value
                    expected_key = "rzp_test_ShHfiwsCroFTnd"
                    if data["razorpay_key_id"] != expected_key:
                        self.log_test(
                            "POST /api/payments/create-order",
                            False,
                            f"Expected razorpay_key_id {expected_key}, got {data['razorpay_key_id']}",
                            data
                        )
                    else:
                        # Store local_order_id and razorpay_order_id for verify test
                        self.local_order_id = data["local_order_id"]
                        self.razorpay_order_id = data["razorpay_order_id"]
                        self.log_test(
                            "POST /api/payments/create-order",
                            True,
                            f"Order created successfully. Amount: {data['amount']} paise",
                            data
                        )
            else:
                self.log_test(
                    "POST /api/payments/create-order",
                    False,
                    f"Expected status 200, got {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "POST /api/payments/create-order",
                False,
                f"Request failed: {str(e)}"
            )
    
    def test_4_verify_payment_invalid_signature(self):
        """Test POST /api/payments/verify with fake signature (should return 400)"""
        if not hasattr(self, 'local_order_id') or not hasattr(self, 'razorpay_order_id'):
            self.log_test(
                "POST /api/payments/verify (invalid signature)",
                False,
                "Cannot test - no local_order_id or razorpay_order_id from create-order test"
            )
            return
        
        fake_verify_data = {
            "razorpay_order_id": self.razorpay_order_id,  # Use correct order ID
            "razorpay_payment_id": "pay_fake456",
            "razorpay_signature": "fake_signature_12345",
            "local_order_id": self.local_order_id
        }
        
        try:
            response = self.session.post(
                f"{API_BASE}/payments/verify",
                json=fake_verify_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 400:
                data = response.json() if response.content else {}
                detail = data.get("detail", "")
                if "Invalid payment signature" in detail:
                    self.log_test(
                        "POST /api/payments/verify (invalid signature)",
                        True,
                        "Correctly rejected invalid signature with 400 status",
                        data
                    )
                else:
                    self.log_test(
                        "POST /api/payments/verify (invalid signature)",
                        False,
                        f"Got 400 but wrong error message: {detail}",
                        data
                    )
            else:
                self.log_test(
                    "POST /api/payments/verify (invalid signature)",
                    False,
                    f"Expected status 400, got {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "POST /api/payments/verify (invalid signature)",
                False,
                f"Request failed: {str(e)}"
            )
    
    def test_5_verify_payment_nonexistent_order(self):
        """Test POST /api/payments/verify with non-existent local_order_id (should return 404)"""
        fake_verify_data = {
            "razorpay_order_id": "order_fake123",
            "razorpay_payment_id": "pay_fake456", 
            "razorpay_signature": "fake_signature_12345",
            "local_order_id": "non-existent-uuid-12345"
        }
        
        try:
            response = self.session.post(
                f"{API_BASE}/payments/verify",
                json=fake_verify_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 404:
                self.log_test(
                    "POST /api/payments/verify (non-existent order)",
                    True,
                    "Correctly returned 404 for non-existent local_order_id",
                    response.json() if response.content else {}
                )
            else:
                self.log_test(
                    "POST /api/payments/verify (non-existent order)",
                    False,
                    f"Expected status 404, got {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "POST /api/payments/verify (non-existent order)",
                False,
                f"Request failed: {str(e)}"
            )
    
    def test_6_rider_login_valid(self):
        """Test POST /api/rider/login with correct passcode"""
        login_data = {"passcode": "12345"}
        
        try:
            response = self.session.post(
                f"{API_BASE}/rider/login",
                json=login_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                if "token" in data:
                    self.rider_token = data["token"]
                    self.log_test(
                        "POST /api/rider/login (valid passcode)",
                        True,
                        "Successfully logged in with correct passcode",
                        {"token_received": True}
                    )
                else:
                    self.log_test(
                        "POST /api/rider/login (valid passcode)",
                        False,
                        "Response missing 'token' field",
                        data
                    )
            else:
                self.log_test(
                    "POST /api/rider/login (valid passcode)",
                    False,
                    f"Expected status 200, got {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "POST /api/rider/login (valid passcode)",
                False,
                f"Request failed: {str(e)}"
            )
    
    def test_7_rider_login_invalid(self):
        """Test POST /api/rider/login with wrong passcode"""
        login_data = {"passcode": "wrong"}
        
        try:
            response = self.session.post(
                f"{API_BASE}/rider/login",
                json=login_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 401:
                self.log_test(
                    "POST /api/rider/login (invalid passcode)",
                    True,
                    "Correctly rejected invalid passcode with 401 status",
                    response.json() if response.content else {}
                )
            else:
                self.log_test(
                    "POST /api/rider/login (invalid passcode)",
                    False,
                    f"Expected status 401, got {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "POST /api/rider/login (invalid passcode)",
                False,
                f"Request failed: {str(e)}"
            )
    
    def test_8_rider_orders_with_token(self):
        """Test GET /api/rider/orders with valid Bearer token"""
        if not self.rider_token:
            self.log_test(
                "GET /api/rider/orders (with token)",
                False,
                "Cannot test - no rider token from login test"
            )
            return
        
        try:
            headers = {"Authorization": f"Bearer {self.rider_token}"}
            response = self.session.get(f"{API_BASE}/rider/orders", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                if "orders" in data:
                    orders = data["orders"]
                    self.log_test(
                        "GET /api/rider/orders (with token)",
                        True,
                        f"Successfully retrieved orders list with {len(orders)} orders",
                        {"orders_count": len(orders)}
                    )
                else:
                    self.log_test(
                        "GET /api/rider/orders (with token)",
                        False,
                        "Response missing 'orders' field",
                        data
                    )
            else:
                self.log_test(
                    "GET /api/rider/orders (with token)",
                    False,
                    f"Expected status 200, got {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "GET /api/rider/orders (with token)",
                False,
                f"Request failed: {str(e)}"
            )
    
    def test_9_rider_orders_without_token(self):
        """Test GET /api/rider/orders without Authorization header"""
        try:
            response = self.session.get(f"{API_BASE}/rider/orders")
            
            if response.status_code == 401:
                self.log_test(
                    "GET /api/rider/orders (without token)",
                    True,
                    "Correctly rejected request without token with 401 status",
                    response.json() if response.content else {}
                )
            else:
                self.log_test(
                    "GET /api/rider/orders (without token)",
                    False,
                    f"Expected status 401, got {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "GET /api/rider/orders (without token)",
                False,
                f"Request failed: {str(e)}"
            )
    
    def test_10_rider_update_order_status(self):
        """Test POST /api/rider/orders/{fake-uuid}/status with valid Bearer token"""
        if not self.rider_token:
            self.log_test(
                "POST /api/rider/orders/{id}/status",
                False,
                "Cannot test - no rider token from login test"
            )
            return
        
        fake_uuid = "12345678-1234-1234-1234-123456789abc"
        status_data = {"payment_status": "ready"}
        
        try:
            headers = {
                "Authorization": f"Bearer {self.rider_token}",
                "Content-Type": "application/json"
            }
            response = self.session.post(
                f"{API_BASE}/rider/orders/{fake_uuid}/status",
                json=status_data,
                headers=headers
            )
            
            if response.status_code == 200:
                data = response.json()
                self.log_test(
                    "POST /api/rider/orders/{id}/status",
                    True,
                    "Successfully updated order status (Supabase may return empty update)",
                    data
                )
            else:
                self.log_test(
                    "POST /api/rider/orders/{id}/status",
                    False,
                    f"Expected status 200, got {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test(
                "POST /api/rider/orders/{id}/status",
                False,
                f"Request failed: {str(e)}"
            )
    
    def run_all_tests(self):
        """Run all API tests in sequence"""
        print("🧪 Starting Fresh Cluck Backend API Tests")
        print("=" * 50)
        print()
        
        # Run tests in order
        self.test_1_get_shop_settings()
        self.test_2_get_products()
        self.test_3_create_order()
        self.test_4_verify_payment_invalid_signature()
        self.test_5_verify_payment_nonexistent_order()
        self.test_6_rider_login_valid()
        self.test_7_rider_login_invalid()
        self.test_8_rider_orders_with_token()
        self.test_9_rider_orders_without_token()
        self.test_10_rider_update_order_status()
        
        # Summary
        print("=" * 50)
        print("📊 TEST SUMMARY")
        print("=" * 50)
        
        passed = sum(1 for result in self.test_results if result["success"])
        total = len(self.test_results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success Rate: {(passed/total)*100:.1f}%")
        print()
        
        # List failed tests
        failed_tests = [result for result in self.test_results if not result["success"]]
        if failed_tests:
            print("❌ FAILED TESTS:")
            for test in failed_tests:
                print(f"  - {test['test']}: {test['details']}")
        else:
            print("🎉 ALL TESTS PASSED!")
        
        return passed == total

if __name__ == "__main__":
    tester = FreshCluckAPITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)