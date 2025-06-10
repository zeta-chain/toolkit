import { Command } from "commander";

const showRequired = (command: Command) => {
  const mandatoryOptions = command.options
    .filter((option) => option.mandatory)
    .map((option) => option.long)
    .join(" ");

  command.options.forEach((option) => {
    if (option.mandatory) {
      option.description = `${option.description} (required)`;
    }
  });

  if (mandatoryOptions) {
    const options = `Required options:\n\n${command.name()} ${mandatoryOptions}`;
    const isEmpty = command.description() === "";
    command.description(
      isEmpty ? options : `${command.description()}\n\n${options}`
    );
  }

  return command;
};

export const showRequiredOptions = (command: Command) => {
  showRequired(command);

  command.commands.forEach((subcommand) => {
    showRequiredOptions(subcommand);
  });

  return command;
};
