import json
from itertools import combinations
from collections import defaultdict

# File mappings
DATA_FILES = {
    'round1': 'matchupscores/set1matchups.json',
    'round2table': 'matchupscores/set2matchupstable.json',
    'round2opponents': 'matchupscores/set2matchupsopponents.json',
    'round3table': 'matchupscores/set3matchupstable.json',
    'round3opponents': 'matchupscores/set3matchupsopponents.json',
    'round4table': 'matchupscores/set4matchupstable.json',
    'round4elevations': 'matchupscores/set4matchupselevation.json',
    'round4opponents': 'matchupscores/set4matchupsopponents.json',
    'round5p15iv': 'matchupscores/round5pmatchupstable15IV.json',
    'round5p21iv': 'matchupscores/round5pmatchupstable21IV.json',
    'round5p31iv': 'matchupscores/round5pmatchupstable31IV.json',
    'round5popponents': 'matchupscores/round5pmatchupsopponents.json'
}

FREQUENCY_FILES = {
    'round1': 'frequencies/round_1_frequencies.json',
    'round2': 'frequencies/round_2_frequencies.json',
    'round3': 'frequencies/round_3_frequencies.json',
    'round4': 'frequencies/round_4_frequencies.json',
    'round5': 'frequencies/round_5plus_frequencies.json'
}

def parse_set_name(full_name):
    """Parse a set name to extract base name and ability"""
    parts = full_name.split('-')
    last_part = parts[-1]
    
    # Check if last part is a number (set number) or letters (ability)
    if last_part.isdigit():
        return {
            'baseName': full_name,
            'ability': None
        }
    else:
        return {
            'baseName': '-'.join(parts[:-1]),
            'ability': last_part
        }

def extract_base_name(set_name):
    """
    Extract base Pokemon name without ability suffix.
    e.g., "Aerodactyl-1-RockHead" -> "Aerodactyl-1"
    """
    parts = set_name.split('-')
    
    # Typical formats:
    # Pokemon-SetNumber (e.g., "Aerodactyl-1")
    # Pokemon-SetNumber-Ability (e.g., "Aerodactyl-1-RockHead")
    
    if len(parts) >= 3:
        # Check if second part is a number (set number)
        if parts[1].isdigit():
            # Return Pokemon-SetNumber (first two parts)
            return '-'.join(parts[:2])
    
    # If only 2 parts or format doesn't match expected pattern, return as-is
    return set_name

def get_pokemon_base(set_name):
    """Get the pokemon base name without set number or ability"""
    parsed = parse_set_name(set_name)
    base_name = parsed['baseName']
    # Remove the set number as well
    parts = base_name.split('-')
    return '-'.join(parts[:-1]) if len(parts) > 1 else base_name

def load_frequency_data():
    """Load all frequency data files"""
    frequency_data = {}
    
    for round_key, filepath in FREQUENCY_FILES.items():
        try:
            with open(filepath, 'r') as f:
                data = json.load(f)
                
                # Build frequency map
                # Frequency files contain base Pokemon names without abilities
                # (e.g., "Aerodactyl-1" not "Aerodactyl-1-RockHead")
                freq_map = {}
                
                for item in data:
                    freq_map[item['name']] = item['frequency']
                
                frequency_data[round_key] = freq_map
                print(f"  Loaded frequency data for {round_key}")
        except Exception as e:
            print(f"  Error loading frequency data for {round_key}: {e}")
            frequency_data[round_key] = {}
    
    return frequency_data

def get_frequency_round(dataset_key):
    """Map dataset key to frequency round key"""
    if dataset_key == 'round1':
        return 'round1'
    elif dataset_key.startswith('round2'):
        return 'round2'
    elif dataset_key.startswith('round3'):
        return 'round3'
    elif dataset_key.startswith('round4'):
        return 'round4'
    elif dataset_key.startswith('round5'):
        return 'round5'
    return 'round1'

def calculate_weighted_average(scores, frequency_map):
    """
    Calculate weighted average using frequency data.
    Properly handles ability variants by splitting frequencies.
    """
    # Group scores by base Pokemon name and count variants
    base_name_groups = defaultdict(lambda: {'scores': [], 'base_frequency': 1.0})
    
    for opponent_name, score in scores.items():
        # Extract base name (removes ability suffix)
        base_name = extract_base_name(opponent_name)
        
        # Get frequency for base name
        base_frequency = frequency_map.get(base_name, 1.0)
        
        base_name_groups[base_name]['scores'].append(score)
        base_name_groups[base_name]['base_frequency'] = base_frequency
    
    # Calculate weighted average with split frequencies
    total_weighted_score = 0
    total_weight = 0
    
    for base_name, group in base_name_groups.items():
        num_variants = len(group['scores'])
        weight_per_variant = group['base_frequency'] / num_variants
        
        for score in group['scores']:
            total_weighted_score += score * weight_per_variant
            total_weight += weight_per_variant
    
    return total_weighted_score / total_weight if total_weight > 0 else 0

def calculate_team_score(team, all_sets_data, frequency_map):
    """Calculate weighted team score with proper frequency splitting"""
    if not all_sets_data:
        return 0

    team_names = [member['name'] for member in team]
    
    # Build a lookup for quick access
    scores_lookup = {}
    for set_data in all_sets_data:
        scores_lookup[set_data['name']] = set_data['scores']
    
    # Group opponents by base name to handle ability variants
    opponent_groups = defaultdict(list)
    for opponent_data in all_sets_data:
        opponent_name = opponent_data['name']
        base_name = extract_base_name(opponent_name)
        opponent_groups[base_name].append(opponent_name)
    
    total_weighted_score = 0
    total_weight = 0
    
    # For each base opponent
    for base_name, opponent_variants in opponent_groups.items():
        # Get base frequency and split among variants
        base_frequency = frequency_map.get(base_name, 1.0)
        num_variants = len(opponent_variants)
        weight_per_variant = base_frequency / num_variants
        
        # For each variant
        for opponent_name in opponent_variants:
            max_score = 0
            
            # Find the max score among team members against this opponent
            for team_member in team_names:
                if team_member in scores_lookup and opponent_name in scores_lookup[team_member]:
                    score = scores_lookup[team_member][opponent_name]
                    max_score = max(max_score, score)
            
            total_weighted_score += max_score * weight_per_variant
            total_weight += weight_per_variant
    
    return total_weighted_score / total_weight if total_weight > 0 else 0

def calculate_top_teams(all_sets_data, frequency_map, top_n_sets=200, output_teams=20):
    """Calculate top teams with restrictions"""
    # Sort by average and get top N sets
    sorted_sets = sorted(all_sets_data, key=lambda x: x['average'], reverse=True)[:top_n_sets]
    
    print(f"  Generating teams from top {len(sorted_sets)} sets...")
    
    # Generate all valid team combinations
    valid_teams = []
    team_count = 0
    
    for combo in combinations(sorted_sets, 3):
        # Check if all three pokemon are different (no duplicate base names)
        base_names = [get_pokemon_base(s['name']) for s in combo]
        if len(set(base_names)) != 3:
            continue
        
        team_count += 1
        if team_count % 10000 == 0:
            print(f"    Processed {team_count} valid teams...")
        
        # Calculate team score with frequency weighting
        score = calculate_team_score(list(combo), all_sets_data, frequency_map)
        
        team_members = [s['name'] for s in combo]
        valid_teams.append({
            'members': team_members,
            'score': score
        })
    
    print(f"  Total valid teams: {len(valid_teams)}")
    
    # Sort by score
    valid_teams.sort(key=lambda x: x['score'], reverse=True)
    
    # Now combine teams with different ability combinations
    print(f"  Combining ability variants...")
    combined_teams = []
    used_indices = set()
    
    for i in range(len(valid_teams)):
        if len(combined_teams) >= output_teams:
            break
        if i in used_indices:
            continue
        
        current_team = valid_teams[i]
        current_bases = [parse_set_name(m)['baseName'] for m in current_team['members']]
        
        # Find all teams with the same base composition
        variants = [{'index': i, 'team': current_team}]
        
        for j in range(i + 1, len(valid_teams)):
            if j in used_indices:
                continue
            
            other_team = valid_teams[j]
            other_bases = [parse_set_name(m)['baseName'] for m in other_team['members']]
            
            # Check if same composition (order doesn't matter)
            if sorted(current_bases) == sorted(other_bases):
                variants.append({'index': j, 'team': other_team})
        
        # Mark all variants as used
        for variant in variants:
            used_indices.add(variant['index'])
        
        # Store the best variant with all ability combinations
        best_variant = variants[0]['team']
        all_variants = [v['team'] for v in variants]
        
        combined_teams.append({
            'members': best_variant['members'],
            'score': best_variant['score'],
            'allVariants': all_variants
        })
    
    return combined_teams

def combine_abilities_in_list(sets_list, target_count):
    """Combine sets with multiple abilities and expand to target count"""
    result = []
    used = set()
    
    for i in range(len(sets_list)):
        if len(result) >= target_count:
            break
        if i in used:
            continue
            
        current_set = sets_list[i]
        current_info = parse_set_name(current_set['name'])
        
        # Only try to combine if this set has an ability specified
        if not current_info['ability']:
            result.append({
                'displayName': current_set['name'],
                'displayScore': f"{current_set['average']:.3f}",
                'average': current_set['average'],
                'baseName': current_info['baseName']
            })
            used.add(i)
            continue
        
        # Look for another set with the same base name
        found_pair = None
        for j in range(i + 1, len(sets_list)):
            if j in used:
                continue
            
            other_set = sets_list[j]
            other_info = parse_set_name(other_set['name'])
            
            if other_info['ability'] and current_info['baseName'] == other_info['baseName']:
                found_pair = {'index': j, 'set': other_set, 'info': other_info}
                break
        
        if found_pair:
            # Combine the two sets
            result.append({
                'displayName': f"{current_info['baseName']}-{current_info['ability']}/{found_pair['info']['ability']}",
                'displayScore': f"{current_set['average']:.3f} ({found_pair['set']['average']:.3f})",
                'average': current_set['average'],
                'baseName': current_info['baseName']
            })
            used.add(i)
            used.add(found_pair['index'])
        else:
            # No pair found, add as is
            result.append({
                'displayName': current_set['name'],
                'displayScore': f"{current_set['average']:.3f}",
                'average': current_set['average'],
                'baseName': current_info['baseName']
            })
            used.add(i)
    
    return result

def process_dataset(dataset_key, filepath, frequency_data):
    """Process a single dataset"""
    print(f"\nProcessing {dataset_key}...")
    
    with open(filepath, 'r') as f:
        data = json.load(f)
    
    print(f"  Loaded {len(data)} sets")
    
    # Get frequency map for this dataset
    freq_round = get_frequency_round(dataset_key)
    freq_map = frequency_data.get(freq_round, {})
    
    # Recalculate weighted averages for all sets
    print(f"  Calculating weighted averages...")
    for set_data in data:
        set_data['average'] = calculate_weighted_average(set_data['scores'], freq_map)
    
    # Sort by weighted average
    sorted_sets = sorted(data, key=lambda x: x['average'], reverse=True)
    
    # Get top 40 and bottom 40 (buffer for combining)
    top_raw = sorted_sets[:40]
    bottom_raw = sorted_sets[-40:]
    bottom_raw.reverse()
    
    # Combine abilities and get exactly 20
    top_20 = combine_abilities_in_list(top_raw, 20)
    bottom_20 = combine_abilities_in_list(bottom_raw, 20)
    
    print(f"  Top 20: {len(top_20)} entries")
    print(f"  Bottom 20: {len(bottom_20)} entries")
    
    # Calculate top teams
    # Use top 200 for round5+ files, fewer for smaller datasets
    if 'round5' in dataset_key:
        top_n = min(200, len(data))
    else:
        top_n = min(100, len(data))
    
    print(f"  Calculating top teams (using top {top_n} sets)...")
    top_teams = calculate_top_teams(data, freq_map, top_n_sets=top_n, output_teams=20)
    
    print(f"  Top teams: {len(top_teams)} entries")
    
    return {
        'topSets': top_20,
        'bottomSets': bottom_20,
        'topTeams': top_teams
    }

def main():
    print("Loading frequency data...")
    frequency_data = load_frequency_data()
    
    overview_data = {}
    
    for dataset_key, filepath in DATA_FILES.items():
        try:
            overview_data[dataset_key] = process_dataset(dataset_key, filepath, frequency_data)
        except Exception as e:
            print(f"Error processing {dataset_key}: {e}")
            import traceback
            traceback.print_exc()
    
    # Save to file
    output_file = 'overview_data.json'
    print(f"\nSaving to {output_file}...")
    with open(output_file, 'w') as f:
        json.dump(overview_data, f, indent=2)
    
    print(f"\nDone! Overview data saved to {output_file}")

if __name__ == '__main__':
    main()