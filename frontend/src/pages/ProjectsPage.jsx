import React, { useEffect, useState } from 'react';
import { FolderGit2, Clock, ChevronRight, Trash2, PlusCircle, LayoutGrid } from 'lucide-react';

const LS_PROJECTS = "compiler_projects";
const LS_ACTIVE = "active_project";

const ProjectsPage = () => {

  const [projects, setProjects] = useState([]);

  // ─────────────────────────────────────────
  // LOAD + MIGRATE OLD PROJECTS
  // ─────────────────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem(LS_PROJECTS);

    if (stored) {
      let parsed = JSON.parse(stored);

      // 🔥 MIGRATION (old → new structure)
      parsed = parsed.map(p => {
        if (!p.structure) {
          return {
            ...p,
            structure: [
              { type: "file", name: "main.c", code: p.code || "" }
            ],
            activePath: [0]
          };
        }
        return p;
      });

      localStorage.setItem(LS_PROJECTS, JSON.stringify(parsed));
      setProjects(parsed);

    } else {
      // 🔥 FIRST TIME DEFAULT PROJECT
      const initial = [
        {
          id: 1,
          name: "Default_Project",
          structure: [
            { type: "file", name: "main.c", code: "a = 2 * 3 + 4;" }
          ],
          activePath: [0],
          lastOpened: "just now",
          status: "STABLE"
        }
      ];

      localStorage.setItem(LS_PROJECTS, JSON.stringify(initial));
      setProjects(initial);
    }
  }, []);

  // ─────────────────────────────────────────
  // CREATE PROJECT
  // ─────────────────────────────────────────
  const createProject = () => {
    const name = prompt("Enter project name:");
    if (!name) return;

    const newProject = {
      id: Date.now(),
      name,

      // 🔥 NEW STRUCTURE
      structure: [
        { type: "file", name: "main.c", code: "" }
      ],
      activePath: [0],

      lastOpened: "just now",
      status: "IN_PROGRESS"
    };

    const updated = [newProject, ...projects];
    setProjects(updated);
    localStorage.setItem(LS_PROJECTS, JSON.stringify(updated));
  };

  // ─────────────────────────────────────────
  // DELETE PROJECT
  // ─────────────────────────────────────────
  const deleteProject = (id) => {
    const updated = projects.filter(p => p.id !== id);
    setProjects(updated);
    localStorage.setItem(LS_PROJECTS, JSON.stringify(updated));
  };

  // ─────────────────────────────────────────
  // OPEN PROJECT
  // ─────────────────────────────────────────
  const openProject = (project) => {
    localStorage.setItem(LS_ACTIVE, project.id);
    window.location.href = "/editor";
  };

  return (
    <div className="h-full w-full flex flex-col p-2 py-4 px-6 overflow-y-auto">
      
      {/* HEADER */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="font-orbitron text-xl text-cyan-400 flex items-center">
            <LayoutGrid className="mr-3" size={24} />
            PROJECT_WORKSPACE
          </h2>
          <p className="text-gray-400 text-sm mt-1">Manage compiler configurations</p>
        </div>

        <button onClick={createProject}
          className="flex items-center space-x-2 px-6 py-2 border border-cyan-400/20 text-cyan-400 rounded-lg">
          <PlusCircle size={16} />
          <span>NEW_PROJECT</span>
        </button>
      </div>

      {/* PROJECT GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <div key={project.id}
            className="bg-[#0E121C] p-6 rounded-xl border border-gray-800 flex flex-col group hover:scale-[1.02] transition"
          >
            {/* TOP */}
            <div className="flex justify-between mb-4">
              <div className="w-10 h-10 flex items-center justify-center bg-gray-800 rounded">
                <FolderGit2 size={20} />
              </div>

              <button onClick={() => deleteProject(project.id)}>
                <Trash2 size={14} />
              </button>
            </div>

            {/* NAME */}
            <h3 className="text-white text-lg mb-2">{project.name}</h3>

            {/* LAST OPENED */}
            <div className="text-gray-500 text-xs mb-3 flex items-center">
              <Clock size={12} className="mr-1" />
              {project.lastOpened}
            </div>

            {/* 🆕 FILE COUNT */}
            <div className="text-xs text-gray-400 mb-4">
              Files: {project.structure?.length || 0}
            </div>

            {/* STATUS */}
            <div className="mt-auto flex justify-between items-center">
              <span className={`text-xs ${
                project.status === "STABLE" ? "text-green-400" :
                project.status === "FAILED_BUILD" ? "text-red-400" :
                "text-cyan-400"
              }`}>
                {project.status}
              </span>

              <button onClick={() => openProject(project)}
                className="text-cyan-400 text-xs flex items-center">
                OPEN <ChevronRight size={14} />
              </button>
            </div>

          </div>
        ))}
      </div>

    </div>
  );
};

export default ProjectsPage;