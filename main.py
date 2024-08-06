# TODO: 
# - specify date/time format
# - fix file names
# - trim raw copied chrome console output so the .cvs-formatted data is
#   only included in the cvs_data.txt
# - ensure javascript output divides is divided by the correct keyword



# keyword that each report is divided by in clean_list_cvs array
keyword = "new\n"

with open(r"cvs_data.txt", "r") as file:
    lines = file.readlines()
    start = 0
    end = 0
    for line in lines:
        if line == keyword or end == len(lines) - 1:
            if end == len(lines) - 1: 
                end += 1
            report = [e.replace("\n", "") for e in lines[start:end]]
            with open(f"reports/{str(report[0])}.csv", "w") as file_new:
                file_new.write("DATE-TIME (...), EAST MW (MASL), WEST MW (MASL) FLOW (L/s), VOLUME (L)\n" +
                               "\n".join(report))
            start = end + 1
        end += 1
