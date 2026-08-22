import dotenv from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../apps/api/generated/prisma/client.ts";
import bcrypt from "bcrypt";

dotenv.config();

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  // Seed Orgnizations
  const organizationNames = [
    "TaskFlow Labs",
    "Rj Technologies",
  ];

  for (const name of organizationNames) {
    const existingOrganization = await prisma.organization.findFirst({
      where: { name },
    });

    if (!existingOrganization) {
      await prisma.organization.create({
        data: { name },
      });
    }
  }

  //----------------------------------------------------------
  // SEED Users

  const passwordHash = await bcrypt.hash("Password@123", 12);

  await prisma.user.createMany({
      data: [
        {
          name: "user1",
          email: "user1@taskflow.com",
          password_hash: passwordHash,
        },
        {
          name: "user2",
          email: "user2@taskflow.com",
          password_hash: passwordHash,
        },
        {
          name: "user3",
          email: "user3@taskflow.com",
          password_hash: passwordHash,
        },
        {
          name: "user4",
          email: "user4@taskflow.com",
          password_hash: passwordHash,
        },
        {
          name: "user5",
          email: "user5@taskflow.com",
          password_hash: passwordHash,
        }
      ],
      skipDuplicates: true
  });

  //---------------------------------------------
  // Get Data with Ids to Map

  const taskflow = await prisma.organization.findFirst({
    where: {
      name: "TaskFlow Labs",
    },
  });

  const rjTech = await prisma.organization.findFirst({
    where: {
      name: "Rj Technologies",
    },
  });

  const user1 = await prisma.user.findUnique({
    where: {
      email: "user1@taskflow.com",
    },
  });

  const user2 = await prisma.user.findUnique({
    where: {
      email: "user2@taskflow.com",
    },
  });

  const user3 = await prisma.user.findUnique({
    where: {
      email: "user3@taskflow.com",
    },
  });

  const user4 = await prisma.user.findUnique({
    where: {
      email: "user4@taskflow.com",
    },
  });

  const user5 = await prisma.user.findUnique({
    where: {
      email: "user5@taskflow.com",
    },
  });

  // -----------------------------------
  // seed orgMembers

  await prisma.orgMember.createMany({
    data: [
      {
        user_id: user1.id,
        org_id: taskflow.id,
        role: "org_admin",
      },
      {
        user_id: user2.id,
        org_id: taskflow.id,
        role: "member",
      },
      {
        user_id: user3.id,
        org_id: taskflow.id,
        role: "member",
      },
      {
        user_id: user4.id,
        org_id: rjTech.id,
        role: "org_admin",
      },
      {
        user_id: user5.id,
        org_id: rjTech.id,
        role: "member",
      },
    ],
    skipDuplicates: true
  });

  //--------------------------------------
  // seed projects

  const projectData = [
    {
      name: "Backend API",
      description: "TaskFlow backend API",
      org_id: taskflow.id,
    },
    {
      name: "Frontend App",
      description: "TaskFlow React frontend",
      org_id: taskflow.id,
    },
    {
      name: "Mobile Client",
      description: "TaskFlow mobile app (React Native)",
      org_id: rjTech.id,
    },
    {
      name: "DevOps Pipeline",
      description: "CI/CD setup for TaskFlow",
      org_id: rjTech.id,
    },
  ];

  for (const project of projectData) {
    const existingProject = await prisma.project.findFirst({
      where: {
        name: project.name,
        org_id: project.org_id,
      },
    });

    if (!existingProject) {
      await prisma.project.create({
        data: project,
      });
    }
  }

  //-------------------------------------
  // SEED Tasks
  const createdTaskflowProjects = await prisma.project.findMany({
    where: { org_id: taskflow.id },
    orderBy: { created_at: "asc" },
    select: { id: true, name: true },
  });

  const createdRjTechProjects = await prisma.project.findMany({
    where: { org_id: rjTech.id },
    orderBy: { created_at: "asc" },
    select: { id: true, name: true },
  });

  const taskData = [
    // Backend API
    {
      title: "Implement authentication",
      description: "Build login and token refresh flow",
      project_id: createdTaskflowProjects[0].id,
      status: "in_progress",
      priority: "high",
    },
    {
      title: "Create project API",
      description: "Implement project CRUD endpoints",
      project_id: createdTaskflowProjects[0].id,
      status: "todo",
      priority: "medium",
    },
    {
      title: "Add API validation",
      description: "Add request validation to API endpoints",
      project_id: createdTaskflowProjects[0].id,
      status: "review",
      priority: "high",
    },

    // Frontend App
    {
      title: "Build dashboard layout",
      description: "Create the main dashboard interface",
      project_id: createdTaskflowProjects[1].id,
      status: "done",
      priority: "medium",
    },
    {
      title: "Create task board",
      description: "Implement task board UI",
      project_id: createdTaskflowProjects[1].id,
      status: "in_progress",
      priority: "high",
    },
    {
      title: "Add task filters",
      description: "Add status and priority filters",
      project_id: createdTaskflowProjects[1].id,
      status: "todo",
      priority: "low",
    },

    // Mobile Client
    {
      title: "Setup mobile authentication",
      description: "Implement authentication screens",
      project_id: createdRjTechProjects[0].id,
      status: "in_progress",
      priority: "urgent",
    },
    {
      title: "Build mobile task list",
      description: "Display project tasks in the mobile app",
      project_id: createdRjTechProjects[0].id,
      status: "todo",
      priority: "high",
    },
    {
      title: "Add push notifications",
      description: "Implement mobile notification support",
      project_id: createdRjTechProjects[0].id,
      status: "review",
      priority: "medium",
    },

    // DevOps Pipeline
    {
      title: "Create deployment pipeline",
      description: "Set up CI/CD deployment workflow",
      project_id: createdRjTechProjects[1].id,
      status: "todo",
      priority: "medium",
    },
    {
      title: "Configure production monitoring",
      description: "Set up application and infrastructure monitoring",
      project_id: createdRjTechProjects[1].id,
      status: "done",
      priority: "low",
    },
    {
      title: "Add automated backups",
      description: "Configure automated database backup process",
      project_id: createdRjTechProjects[1].id,
      status: "in_progress",
      priority: "high",
    },
  ];

  for (const task of taskData) {
    const existingTask = await prisma.task.findFirst({
      where: {
        title: task.title,
        project_id: task.project_id,
      },
    });

    if (!existingTask) {
      await prisma.task.create({
        data: task,
      });
    }
  }

  // ----------------------------

  // SEED Task Assignment

  const allTasks = await prisma.task.findMany({orderBy: {created_at: "asc"}});

  await prisma.taskAssignment.createMany({
    data: [
      {
        task_id: allTasks[0].id,
        user_id: user1.id,
      },
      {
        task_id: allTasks[1].id,
        user_id: user2.id,
      },
      {
        task_id: allTasks[2].id,
        user_id: user3.id,
      },
      {
        task_id: allTasks[3].id,
        user_id: user1.id,
      },
      {
        task_id: allTasks[4].id,
        user_id: user2.id,
      },
      {
        task_id: allTasks[5].id,
        user_id: user4.id,
      },
      {
        task_id: allTasks[6].id,
        user_id: user5.id,
      },
      {
        task_id: allTasks[7].id,
        user_id: user4.id,
      },
    ],
    skipDuplicates: true
  });

  // ---------------------------------------
  // seed comments
  
  const commentData = [
    {
      text: "Authentication API is almost complete.",
      task_id: allTasks[0].id,
      author_id: user1.id,
    },
    {
      text: "I will review the project API today.",
      task_id: allTasks[1].id,
      author_id: user2.id,
    },
    {
      text: "Validation needs some additional test cases.",
      task_id: allTasks[2].id,
      author_id: user3.id,
    },
    {
      text: "Dashboard layout looks good.",
      task_id: allTasks[3].id,
      author_id: user1.id,
    },
    {
      text: "Mobile authentication is under development.",
      task_id: allTasks[4].id,
      author_id: user4.id,
    },
    {
      text: "I'll start working on the mobile task list next.",
      task_id: allTasks[5].id,
      author_id: user5.id,
    },
  ];

  for (const comment of commentData) {
    const existingComment = await prisma.comment.findFirst({
      where: {
        text: comment.text,
        task_id: comment.task_id,
        author_id: comment.author_id,
      },
    });

    if (!existingComment) {
      await prisma.comment.create({
        data: comment,
      });
    }
  }

}

main()
  .then(() => {
    console.log("Database seed complete");
  })
  .catch((err) => {
    console.error("Database seed failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });