import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../apps/api/generated/prisma/client.ts";
import bcrypt from "bcrypt";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const password = await bcrypt.hash("Password@123", 12);

async function main() {
  const existingAssessmentUser = await prisma.user.findUnique({ where: { email: "admin@taskflow.com" } });
  if (existingAssessmentUser) {
    console.log("Assessment seed already exists; skipping.");
    return;
  }

  await prisma.notification.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.taskAssignment.deleteMany();
  await prisma.task.deleteMany();
  await prisma.project.deleteMany();
  await prisma.client.deleteMany();
  await prisma.orgMember.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  const organization = await prisma.organization.create({ data: { name: "Velozity Global Solutions" } });
  const client = await prisma.client.create({ data: { name: "Northstar Health", email: "contact@northstar.example" } });
  const users = {};
  const definitions = [
    ["Admin User", "admin@taskflow.com", "ADMIN"],
    ["Priya Manager", "priya@taskflow.com", "PROJECT_MANAGER"],
    ["Arjun Manager", "arjun@taskflow.com", "PROJECT_MANAGER"],
    ["Ravi Developer", "ravi@taskflow.com", "DEVELOPER"],
    ["Maya Developer", "maya@taskflow.com", "DEVELOPER"],
    ["Noah Developer", "noah@taskflow.com", "DEVELOPER"],
    ["Sara Developer", "sara@taskflow.com", "DEVELOPER"],
  ];
  for (const [name, email, role] of definitions) {
    users[email] = await prisma.user.create({ data: { name, email, password_hash: password, role } });
  }
  for (const user of Object.values(users)) {
    await prisma.orgMember.create({ data: { organization: { connect: { id: organization.id } }, user: { connect: { id: user.id } }, role: user.role === "ADMIN" ? "org_admin" : "member" } });
  }

  const managers = [users["priya@taskflow.com"], users["arjun@taskflow.com"], users["priya@taskflow.com"]];
  const developers = Object.values(users).filter((user) => user.role === "DEVELOPER");
  const statuses = ["todo", "in_progress", "review", "done", "in_progress"];
  const priorities = ["critical", "high", "medium", "low", "high"];
  const tasks = [];

  for (let projectIndex = 0; projectIndex < 3; projectIndex += 1) {
    const project = await prisma.project.create({ data: { name: ["Health Portal", "Retail Analytics", "Mobile Onboarding"][projectIndex], description: "Client delivery project", organization: { connect: { id: organization.id } }, client: { connect: { id: client.id } }, creator: { connect: { id: managers[projectIndex].id } } } });
    for (let taskIndex = 0; taskIndex < 5; taskIndex += 1) {
      const task = await prisma.task.create({ data: { title: `Project ${projectIndex + 1} task ${taskIndex + 1}`, description: "Deliverable tracked by the agency team", project: { connect: { id: project.id } }, status: statuses[taskIndex], priority: priorities[taskIndex], due_date: taskIndex < 2 ? new Date(Date.now() - 86400000 * (taskIndex + 1)) : new Date(Date.now() + 86400000 * (taskIndex + 2)), is_overdue: taskIndex < 2 } });
      tasks.push({ task, developer: developers[(projectIndex + taskIndex) % developers.length] });
    }
  }
  for (const { task, developer } of tasks) {
    await prisma.taskAssignment.create({ data: { task_id: task.id, user_id: developer.id } });
    await prisma.activityLog.create({ data: { project_id: task.project_id, task_id: task.id, actor_id: users["admin@taskflow.com"].id, type: "TASK_STATUS_CHANGED", from_status: "todo", to_status: task.status, message: `${users["admin@taskflow.com"].name} moved ${task.title} to ${task.status}` } });
  }
  await prisma.notification.create({ data: { recipient_id: users["ravi@taskflow.com"].id, task_id: tasks[0].task.id, type: "TASK_ASSIGNED", message: "You were assigned a task" } });
  console.log("Assessment seed complete. Password for all users: Password@123");
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
