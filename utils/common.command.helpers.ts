import { confirm } from "@inquirer/prompts";

export const confirmTransaction = async (options: {
  amount: string;
  message?: string;
  receiver: string;
  rpc: string;
  sender: string;
}) => {
  console.log(`
Sender:   ${options.sender}
Receiver: ${options.receiver}
Amount:   ${options.amount}
Network:  ${options.rpc}${
    options.message ? `\nMessage:  ${options.message}` : ""
  }
`);

  return await confirm({ message: "Proceed?" }, { clearPromptOnDone: true });
};
