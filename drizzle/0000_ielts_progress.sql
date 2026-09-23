CREATE TABLE `learners` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `attempts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`learner_id` text NOT NULL,
	`question_id` text NOT NULL,
	`skill` text NOT NULL,
	`answer` text NOT NULL,
	`is_correct` integer NOT NULL,
	`completed_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`learner_id`) REFERENCES `learners`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_attempts_learner_question` ON `attempts` (`learner_id`,`question_id`);
--> statement-breakpoint
CREATE INDEX `idx_attempts_learner_completed` ON `attempts` (`learner_id`,`completed_at`);

