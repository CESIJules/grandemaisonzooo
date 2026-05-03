import net from "net";
import { PATHS } from "./paths";

/**
 * Send a command to the Liquidsoap telnet interface and return the response.
 */
export function sendLiquidsoapCommand(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    let response = "";

    const timeout = setTimeout(() => {
      client.destroy();
      reject(new Error("Liquidsoap telnet timeout"));
    }, 3000);

    client.connect(PATHS.LIQUIDSOAP_PORT, PATHS.LIQUIDSOAP_HOST, () => {
      client.write(command + "\n");
    });

    client.on("data", (data) => {
      response += data.toString();
      // Liquidsoap ends responses with "END\r\n"
      if (response.includes("END\r\n") || response.includes("END\n")) {
        clearTimeout(timeout);
        client.destroy();
        resolve(response.replace(/END\r?\n$/, "").trim());
      }
    });

    client.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    client.on("close", () => {
      clearTimeout(timeout);
      resolve(response.trim());
    });
  });
}

/**
 * Skip the current track on the radio.
 */
export async function skipTrack(): Promise<string> {
  return sendLiquidsoapCommand("main_playlist.skip");
}
