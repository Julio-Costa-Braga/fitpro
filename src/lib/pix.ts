export interface PixPayloadOptions {
  key: string;
  merchantName: string;
  merchantCity: string;
  amount?: number;
  txid?: string;
}

function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function field(id: string, value: string): string {
  return `${id}${String(value.length).padStart(2, "0")}${value}`;
}

export function buildPixPayload({
  key,
  merchantName,
  merchantCity,
  amount,
  txid = "***",
}: PixPayloadOptions): string {
  const gui = field("00", "br.gov.bcb.pix");
  const pixKey = field("01", key);
  const mai = field("26", gui + pixKey);

  let payload =
    field("00", "01") +
    mai +
    field("52", "0000") +
    field("53", "986");

  if (amount != null) {
    payload += field("54", amount.toFixed(2));
  }

  payload +=
    field("58", "BR") +
    field("59", merchantName.slice(0, 25) || "FITPRO") +
    field("60", merchantCity.slice(0, 15) || "SAO PAULO") +
    field("62", field("05", txid));

  const crc = crc16(payload + "6304");
  return payload + field("63", crc);
}