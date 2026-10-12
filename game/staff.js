/*
 * MeriQuest — sample staff directory (SEED DATA, fictional people)
 *
 * Loaded once into the browser on first run; after that the admin panel manages the list.
 * In production this comes from the HRIS (staff ID, name, email, unit, manager, grade).
 *
 * unit:    cx | wealth | invest | ld | other
 * segment: front | middle | back   (drives the Performance Index weighting)
 * role:    player | manager | admin
 * track:   default starting track (seedling | starlet | welcome | canopy)
 */
window.MERIQUEST_STAFF_SEED = [
  { staffId: "MS0001", name: "L&D Administrator", email: "ld.admin@meristemng.com", unit: "ld", segment: "back", role: "admin", title: "Learning & Development", track: "welcome" },

  { staffId: "MS1001", name: "Tolu Adebayo", email: "tolu.adebayo@meristemng.com", unit: "cx", segment: "front", role: "player", title: "Client Experience Officer", track: "welcome" },
  { staffId: "MS1002", name: "Chiamaka Obi", email: "chiamaka.obi@meristemng.com", unit: "cx", segment: "front", role: "manager", title: "Team Lead, Client Experience", track: "canopy" },
  { staffId: "MS1003", name: "Ibrahim Sani", email: "ibrahim.sani@meristemng.com", unit: "cx", segment: "front", role: "player", title: "Client Experience Officer", track: "welcome" },

  { staffId: "MS2001", name: "Femi Ogunleye", email: "femi.ogunleye@meristemng.com", unit: "wealth", segment: "front", role: "player", title: "Wealth Advisory Intern", track: "seedling" },
  { staffId: "MS2002", name: "Ngozi Eze", email: "ngozi.eze@meristemng.com", unit: "wealth", segment: "front", role: "player", title: "Wealth Advisory Officer", track: "welcome" },
  { staffId: "MS2003", name: "Efe Briggs", email: "efe.briggs@meristemng.com", unit: "wealth", segment: "front", role: "manager", title: "Team Lead, Wealth Advisory", track: "canopy" },

  { staffId: "MS3001", name: "Daniel Etim", email: "daniel.etim@meristemng.com", unit: "invest", segment: "middle", role: "player", title: "Investment Advisory Officer (MSP)", track: "starlet" },
  { staffId: "MS3002", name: "Aisha Bello", email: "aisha.bello@meristemng.com", unit: "invest", segment: "middle", role: "player", title: "Investment Advisory Officer", track: "starlet" },
  { staffId: "MS3003", name: "Bayo Adewale", email: "bayo.adewale@meristemng.com", unit: "invest", segment: "middle", role: "manager", title: "Team Lead, Investment Advisory", track: "canopy" },
];
