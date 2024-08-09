# TODO: 
# - specify date/time format  - DONE
# - fix file names - DONE
# - trim raw copied chrome console output so the .cvs-formatted data is
#   only included in the cvs_data.txt - DONE (loops through entire text file and only includes data between start/end keywords)
# - ensure javascript output divides is divided by the correct keyword - DONE
# - TEST NEW FIXES WITH PYTHON



# key the signifies the reports are below
start_key = "START OF DATA\n"
# keyword that each report is divided by in clean_list_cvs array
report_partition_key = "new\n"
# key that signifies the reports are done
end_key = "END OF DATA\n"

with open(r"cvs_data.txt", "r") as file:
    lines = file.readlines()
    start = 0
    end = 0
    reached_data = false
    for line in lines:
        if reached_data:
            if line == keyword or end == len(lines) - 1:
                if line == end_key:
                    break;
                if end == len(lines) - 1: 
                    end += 1
                report = [e.replace("\n", "") for e in lines[start:end]]
                with open(f"reports/{str(report[0])[0:report[0].index(",")]}.csv", "w") as file_new:
                    file_new.write("\n".join(report))
                start = end + 1
            end += 1
        else:
            end += 1
            start += 1
            if line == start_key:
                reached_data = true
