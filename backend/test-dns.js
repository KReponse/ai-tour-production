import { promises as dns } from "node:dns";

try {
  const records = await dns.resolveSrv("_mongodb._tcp.cluster0.okmcbzz.mongodb.net");
  console.log(records);
} catch (err) {
  console.error(err);
}