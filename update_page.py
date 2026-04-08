import re

file_path = "d:/RSVP INVITES/src/app/coordinator/dashboard/page.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# For check_in_status and checked_in ternaries
content = content.replace(
    "(person.isPrimary ? person.check_in_status === \\\"arrived\\\" : person.checked_in)",
    "((person.isPrimary || person.isLinkedGuest) ? person.check_in_status === \\\"arrived\\\" : person.checked_in)"
)

# For departure_status and departed ternaries
content = content.replace(
    "(person.isPrimary ? person.departure_status === \\\"departed\\\" : person.departed)",
    "((person.isPrimary || person.isLinkedGuest) ? person.departure_status === \\\"departed\\\" : person.departed)"
)

content = re.sub(
    r"onClick=\{\(\) => person\.isPrimary\s*\n\s*\?\s*handleCheckIn\(person\.id,\s*person\.check_in_status\)\s*\n\s*\:\s*handleSubMemberCheckIn\(person\.id,\s*person\.companionIndex,\s*person\.checked_in\)\s*\n\s*\}",
    "onClick={() => (person.isPrimary || person.isLinkedGuest)\\n                                                                        ? handleCheckIn(person.id, person.check_in_status)\\n                                                                        : handleSubMemberCheckIn(person.id, person.companionIndex, person.checked_in)\\n                                                                    }",
    content
)

content = re.sub(
    r"onClick=\{\(\) => person\.isPrimary\s*\n\s*\?\s*handleDepartureCheckIn\(person\.id,\s*person\.departure_status\)\s*\n\s*\:\s*handleSubMemberDeparture\(person\.id,\s*person\.companionIndex,\s*person\.departed\)\s*\n\s*\}",
    "onClick={() => (person.isPrimary || person.isLinkedGuest)\\n                                                                        ? handleDepartureCheckIn(person.id, person.departure_status)\\n                                                                        : handleSubMemberDeparture(person.id, person.companionIndex, person.departed)\\n                                                                    }",
    content
)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Done")
