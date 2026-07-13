import { jwtVerify } from "jose";

const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJvcGVuSWQiOiJsb2NhbDo3MTEwMTkxIiwiYXBwSWQiOiJYeUtaeWdBTGJWYnd1Y0N3Zk1vZVphIiwibmFtZSI6IkF1dGggVGVzdCBVc2VyIiwidXNlcklkIjo3MTEwMTkxLCJlbWFpbCI6InRlc3RhdXRoQGV4YW1wbGUuY29tIiwiZXhwIjoxNzc1MzY2NjUwfQ.lDhb5QTVPi09Oe8fVMxfbda4WN5mDpdh7LMSM1mHSIE";
const secret = process.env.JWT_SECRET;
console.log("JWT_SECRET present:", !!secret, "length:", secret?.length);
const secretKey = new TextEncoder().encode(secret);

try {
  const result = await jwtVerify(token, secretKey, { algorithms: ["HS256"] });
  console.log("Verified payload:", JSON.stringify(result.payload, null, 2));
} catch (e) {
  console.log("Verification failed:", e.message);
}
