import os

filepath = r'c:\Users\shing\OneDrive\Desktop\Project\FastLinereceiptteste\src\app\cost\components\ManagementTab.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if 'handleDelete(`projects/${project.id}`)' in line and '<Trash2' in line and 'Edit2' not in line:
        # Pega a indentação original
        indent = line[:line.find('<Button')]
        edit_button = f'{indent}<Button variant="ghost" size="icon" onClick={() => setEditingProject(project)}><Edit2 className="w-4 h-4 text-indigo-400"/></Button>\n'
        new_lines.append(edit_button)
    new_lines.append(line)

with open(filepath, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Botão de edição inserido com sucesso via script!")
