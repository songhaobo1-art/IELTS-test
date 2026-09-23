CREATE TABLE `vocabulary` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`learner_id` text NOT NULL,
	`word` text NOT NULL,
	`meaning` text NOT NULL,
	`example` text NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`learner_id`) REFERENCES `learners`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_vocabulary_learner_word` ON `vocabulary` (`learner_id`,`word`);
--> statement-breakpoint
CREATE INDEX `idx_vocabulary_learner_status` ON `vocabulary` (`learner_id`,`status`);

