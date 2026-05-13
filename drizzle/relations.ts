import { relations } from "drizzle-orm/relations";
import { users, checkinScheduleAuditLog, dashboardPreferences, emailTemplateCustomizations, paymentEvents, clientProtocols, paymentReminderLogs, pushSubscriptions, pushNotificationLogs } from "./schema";

export const checkinScheduleAuditLogRelations = relations(checkinScheduleAuditLog, ({one}) => ({
	user: one(users, {
		fields: [checkinScheduleAuditLog.changedBy],
		references: [users.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	checkinScheduleAuditLogs: many(checkinScheduleAuditLog),
	dashboardPreferences: many(dashboardPreferences),
	emailTemplateCustomizations: many(emailTemplateCustomizations),
	paymentEvents: many(paymentEvents),
}));

export const dashboardPreferencesRelations = relations(dashboardPreferences, ({one}) => ({
	user: one(users, {
		fields: [dashboardPreferences.userId],
		references: [users.id]
	}),
}));

export const emailTemplateCustomizationsRelations = relations(emailTemplateCustomizations, ({one}) => ({
	user: one(users, {
		fields: [emailTemplateCustomizations.updatedBy],
		references: [users.id]
	}),
}));

export const paymentEventsRelations = relations(paymentEvents, ({one}) => ({
	user: one(users, {
		fields: [paymentEvents.performedBy],
		references: [users.id]
	}),
}));

export const paymentReminderLogsRelations = relations(paymentReminderLogs, ({one}) => ({
	clientProtocol: one(clientProtocols, {
		fields: [paymentReminderLogs.protocolId],
		references: [clientProtocols.id]
	}),
}));

export const clientProtocolsRelations = relations(clientProtocols, ({many}) => ({
	paymentReminderLogs: many(paymentReminderLogs),
}));

export const pushNotificationLogsRelations = relations(pushNotificationLogs, ({one}) => ({
	pushSubscription: one(pushSubscriptions, {
		fields: [pushNotificationLogs.subscriptionId],
		references: [pushSubscriptions.id]
	}),
}));

export const pushSubscriptionsRelations = relations(pushSubscriptions, ({many}) => ({
	pushNotificationLogs: many(pushNotificationLogs),
}));